import React, { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle, IconTrash } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title";
import { getAppName } from "@/lib/config";
import NoTableResults from "@/components/common/no-table-results";
import CopyTextButton from "@/components/common/copy.tsx";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale.ts";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useFetchWebhooks,
  useUpdateWebhook,
} from "@/features/webhook/queries/webhook-query";
import {
  IWebhook,
  WEBHOOK_EVENT_OPTIONS,
} from "@/features/webhook/types/webhook.types";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  enabled: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

export default function WebhooksPage() {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const { data, isLoading, error } = useFetchWebhooks();
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();

  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<IWebhook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IWebhook | null>(null);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return formatLocalized(date, "MMM dd, yyyy", "PP", locale);
  };

  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: {
      url: "",
      events: [],
      enabled: true,
    },
  });

  const handleCreateSubmit = async (values: FormValues) => {
    try {
      const created = await createWebhookMutation.mutateAsync({
        url: values.url,
        events: values.events,
        enabled: values.enabled,
      });
      setCreatedWebhook(created);
      form.reset();
      setCreateModalOpened(false);
    } catch (err) {
      //
    }
  };

  const handleToggleEnabled = (webhook: IWebhook) => {
    updateWebhookMutation.mutate({
      id: webhook.id,
      enabled: !webhook.enabled,
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWebhookMutation.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      //
    }
  };

  if (isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {t("Webhooks")} - {getAppName()}
        </title>
      </Helmet>

      <SettingsTitle title={t("Webhooks")} />

      <Text size="sm" c="dimmed" mb="md">
        {t(
          "Configure webhooks to receive real-time events for pages and shares in your workspace.",
        )}
      </Text>

      <Group justify="flex-end" mb="md">
        <Button onClick={() => setCreateModalOpened(true)}>
          {t("Create Webhook")}
        </Button>
      </Group>

      {error ? (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="red"
          title={t("Error loading webhooks")}
        >
          {error.message || t("Failed to load webhooks. Please try again.")}
        </Alert>
      ) : (
        <Table.ScrollContainer minWidth={600}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("URL")}</Table.Th>
                <Table.Th>{t("Events")}</Table.Th>
                <Table.Th>{t("Enabled")}</Table.Th>
                <Table.Th>{t("Created")}</Table.Th>
                <Table.Th aria-label={t("Action")} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data && data.length > 0 ? (
                data.map((webhook: IWebhook) => (
                  <Table.Tr key={webhook.id}>
                    <Table.Td style={{ maxWidth: 280 }}>
                      <Text fz="sm" fw={500} lineClamp={1}>
                        {webhook.url}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 280 }}>
                      <Group gap={4} wrap="wrap">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="light" size="sm">
                            {event}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={webhook.enabled}
                        onChange={() => handleToggleEnabled(webhook)}
                        aria-label={t("Toggle webhook")}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm" style={{ whiteSpace: "nowrap" }}>
                        {formatDate(webhook.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        variant="subtle"
                        color="red"
                        size="compact-sm"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => setDeleteTarget(webhook)}
                      >
                        {t("Delete")}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <NoTableResults colSpan={5} />
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <CreateWebhookModal
        opened={createModalOpened}
        onClose={() => {
          form.reset();
          setCreateModalOpened(false);
        }}
        onSubmit={handleCreateSubmit}
        loading={createWebhookMutation.isPending}
        form={form}
      />

      <WebhookSecretModal
        opened={!!createdWebhook}
        onClose={() => setCreatedWebhook(null)}
        webhook={createdWebhook}
      />

      <DeleteWebhookModal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteWebhookMutation.isPending}
        webhook={deleteTarget}
      />
    </>
  );
}

interface CreateWebhookModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
  form: ReturnType<typeof useForm<FormValues>>;
}

function CreateWebhookModal({
  opened,
  onClose,
  onSubmit,
  loading,
  form,
}: CreateWebhookModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Create Webhook")}
      size="md"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
        <Stack gap="md">
          <TextInput
            label={t("URL")}
            placeholder="https://example.com/webhook"
            data-autofocus
            required
            {...form.getInputProps("url")}
          />

          <MultiSelect
            label={t("Events")}
            placeholder={t("Select events")}
            data={WEBHOOK_EVENT_OPTIONS}
            required
            searchable
            {...form.getInputProps("events")}
          />

          <Switch
            label={t("Enabled")}
            {...form.getInputProps("enabled", { type: "checkbox" })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={loading}>
              {t("Create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface WebhookSecretModalProps {
  opened: boolean;
  onClose: () => void;
  webhook: IWebhook | null;
}

function WebhookSecretModal({
  opened,
  onClose,
  webhook,
}: WebhookSecretModalProps) {
  const { t } = useTranslation();

  if (!webhook) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Webhook created")}
      size="lg"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={t("Important")}
          color="red"
        >
          {t(
            "Make sure to copy your webhook secret now. You won't be able to see it again!",
          )}
        </Alert>

        <div>
          <Text size="sm" fw={500} mb="xs">
            {t("Signing secret")}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              variant="filled"
              style={{ flex: 1 }}
              value={webhook.secret}
              readOnly
            />
            <CopyTextButton text={webhook.secret} />
          </Group>
        </div>

        <Button fullWidth onClick={onClose} mt="md">
          {t("I've saved my secret")}
        </Button>
      </Stack>
    </Modal>
  );
}

interface DeleteWebhookModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  webhook: IWebhook | null;
}

function DeleteWebhookModal({
  opened,
  onClose,
  onConfirm,
  loading,
  webhook,
}: DeleteWebhookModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Delete Webhook")}
      size="md"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <Stack gap="md">
        <Text>
          {t("Are you sure you want to delete this webhook")}{" "}
          <strong>{webhook?.url}</strong>?
        </Text>
        <Text size="sm" c="dimmed">
          {t(
            "This action cannot be undone. The webhook will stop receiving events.",
          )}
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            {t("Delete")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
