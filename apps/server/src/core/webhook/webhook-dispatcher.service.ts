import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  Webhook,
  WebhookRepo,
} from '@docmost/db/repos/webhook/webhook.repo';

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private readonly webhookRepo: WebhookRepo) {}

  async dispatch(workspaceId: string, event: string, payload: any): Promise<void> {
    try {
      const webhooks = await this.webhookRepo.findEnabledByEvent(
        workspaceId,
        event,
      );
      if (!webhooks || webhooks.length === 0) {
        return;
      }

      // Deliver to each webhook in parallel; failures must not bubble up.
      await Promise.all(
        webhooks.map((webhook) =>
          this.deliver(webhook, event, payload).catch((err: unknown) =>
            this.logger.error(
              `Webhook delivery failed for ${webhook.id} (${event}): ${errToString(err)}`,
            ),
          ),
        ),
      );
    } catch (err) {
      // Never let dispatch break the calling flow.
      this.logger.error(
        `Webhook dispatch failed for event ${event}: ${errToString(err)}`,
      );
    }
  }

  private async deliver(
    webhook: Webhook,
    event: string,
    payload: any,
  ): Promise<void> {
    const delivery = await this.webhookRepo.createDelivery({
      webhookId: webhook.id,
      event,
      payload,
      attempt: 1,
      status: 'pending',
    });

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    let lastStatusCode: number | null = null;
    let lastResponseBody: string | null = null;
    let succeeded = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        // Exponential backoff: attempt 2 waits 2s, attempt 3 waits 4s.
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await sleep(delayMs);
      }

      try {
        const result = await this.sendRequest(
          webhook.url,
          body,
          signature,
          event,
        );
        lastStatusCode = result.statusCode;
        lastResponseBody = result.responseBody;

        if (result.statusCode >= 200 && result.statusCode < 300) {
          succeeded = true;
          break;
        }
      } catch (err) {
        lastStatusCode = null;
        lastResponseBody = errToString(err);
        this.logger.warn(
          `Webhook ${webhook.id} attempt ${attempt}/${MAX_ATTEMPTS} errored: ${lastResponseBody}`,
        );
      }
    }

    await this.webhookRepo.updateDelivery(delivery.id, {
      statusCode: lastStatusCode,
      responseBody: lastResponseBody,
      attempt: MAX_ATTEMPTS,
      status: succeeded ? 'success' : 'failed',
    });
  }

  private async sendRequest(
    url: string,
    body: string,
    signature: string,
    event: string,
  ): Promise<{ statusCode: number; responseBody: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Docmost-Signature': `sha256=${signature}`,
          'X-Docmost-Event': event,
        },
        body,
        signal: controller.signal,
      });

      const responseBody = await safeReadText(response);
      return { statusCode: response.status, responseBody };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function errToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
