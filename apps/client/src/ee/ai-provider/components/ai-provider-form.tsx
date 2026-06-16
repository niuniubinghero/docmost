import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Group,
  TextInput,
  Select,
  Switch,
  Stack,
  PasswordInput,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  createAiProvider,
  updateAiProvider,
} from "@/ee/ai-provider/services/ai-provider-service";
import type {
  AiProvider,
  AiProviderType,
} from "@/ee/ai-provider/types/ai-provider.types";
import {
  AI_PROVIDER_TYPE_LABELS,
  AI_PROVIDER_DEFAULTS,
  MODEL_PRESETS,
} from "@/ee/ai-provider/types/ai-provider.types";

interface AiProviderFormModalProps {
  provider?: AiProvider;
  onSuccess: () => void;
}

export function AiProviderFormModal({ provider, onSuccess }: AiProviderFormModalProps) {
  const [name, setName] = useState(provider?.name || "");
  const [type, setType] = useState<AiProviderType>(provider?.type || "mimo");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "");
  const [modelName, setModelName] = useState(provider?.modelName || "");
  const [isDefault, setIsDefault] = useState(provider?.isDefault || false);
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!provider;

  useEffect(() => {
    if (!isEditing && type) {
      const defaults = AI_PROVIDER_DEFAULTS[type];
      if (defaults) {
        setBaseUrl(defaults.baseUrl);
        setModelName(defaults.modelName);
        if (!name) {
          setName(AI_PROVIDER_TYPE_LABELS[type]);
        }
      }
    }
  }, [type, isEditing]);

  const handleSubmit = async () => {
    if (!name || !type || !modelName) {
      notifications.show({
        title: "Validation Error",
        message: "Name, type, and model name are required",
        color: "red",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing) {
        const updateData: any = {
          providerId: provider.id,
          name,
          type,
          modelName,
          baseUrl,
          isDefault,
          isActive,
        };
        if (apiKey) {
          updateData.apiKey = apiKey;
        }
        await updateAiProvider(updateData);
      } else {
        await createAiProvider({
          name,
          type,
          apiKey: apiKey || undefined,
          baseUrl,
          modelName,
          isDefault,
          isActive,
        });
      }

      notifications.show({
        title: "Success",
        message: isEditing ? "Provider updated" : "Provider created",
        color: "green",
      });

      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to save provider",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const providerTypes = Object.entries(AI_PROVIDER_TYPE_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    })
  );

  return (
    <Stack gap="md">
      <TextInput
        label="Name"
        placeholder="e.g., My MiMo Provider"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
      />

      <Select
        label="Provider Type"
        data={providerTypes}
        value={type}
        onChange={(value) => value && setType(value as AiProviderType)}
        required
        disabled={isEditing}
      />

      {MODEL_PRESETS[type]?.length > 0 ? (
        <Select
          label="Model Name"
          data={MODEL_PRESETS[type].map((model) => ({
            value: model,
            label: model,
          }))}
          value={modelName}
          onChange={(value) => value && setModelName(value)}
          searchable
          required
        />
      ) : (
        <TextInput
          label="Model Name"
          placeholder="e.g., model-name"
          value={modelName}
          onChange={(e) => setModelName(e.currentTarget.value)}
          required
        />
      )}

      <TextInput
        label="Base URL"
        placeholder="e.g., https://api.xiaomi.com/mimo"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.currentTarget.value)}
      />

      <PasswordInput
        label="API Key"
        placeholder={isEditing ? "Leave blank to keep current key" : "Enter your API key"}
        value={apiKey}
        onChange={(e) => setApiKey(e.currentTarget.value)}
      />

      <Group justify="space-between">
        <Switch
          label="Set as default provider"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.currentTarget.checked)}
        />
        <Switch
          label="Active"
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
        />
      </Group>

      <Text size="xs" c="dimmed">
        {type === "ollama"
          ? "Ollama runs locally. Make sure your Ollama server is running and accessible."
          : "Your API key will be stored securely and used only for AI requests."}
      </Text>

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          {isEditing ? "Update" : "Create"}
        </Button>
      </Group>
    </Stack>
  );
}
