import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  Combobox,
  Input,
  useCombobox,
  Loader,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  createAiProvider,
  updateAiProvider,
  fetchProviderModels,
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

function ModelSelect({
  presets,
  value,
  onChange,
  loading,
  onFetchModels,
}: {
  presets: string[];
  value: string;
  onChange: (val: string) => void;
  loading: boolean;
  onFetchModels: () => void;
}) {
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState(value || "");

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const shouldFilterOptions = search !== "";
  const filteredOptions = shouldFilterOptions
    ? presets.filter((opt) =>
        opt.toLowerCase().includes(search.toLowerCase())
      )
    : presets;

  const exactMatch = presets.some(
    (opt) => opt.toLowerCase() === (value || "").toLowerCase()
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onChange(val);
  };

  return (
    <Box>
      <Group gap="xs" mb={4}>
        <Text size="sm" fw={500}>
          Model Name <span style={{ color: "var(--mantine-color-red-6)" }}>*</span>
        </Text>
        <Tooltip label={t("ai.provider.fetch_models_tooltip", "Fetch latest models from provider API")}>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={onFetchModels}
            loading={loading}
          >
            🔄 {t("ai.provider.fetch_models", "Fetch Models")}
          </Button>
        </Tooltip>
      </Group>
      <Combobox
        store={combobox}
        onOptionSubmit={(optionValue) => {
          setSearch(optionValue);
          onChange(optionValue);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <Input
            placeholder={t("ai.provider.input_or_select_model", "Type or select a model name")}
            value={search}
            onChange={(event) => {
              handleSearchChange(event.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            rightSection={loading ? <Loader size={14} /> : <Combobox.Chevron />}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option}
                  value={option}
                  selected={option.toLowerCase() === (value || "").toLowerCase()}
                >
                  {option}
                </Combobox.Option>
              ))
            ) : (
              <Combobox.Empty>{t("ai.provider.no_matches", "No matches found. Type to enter a custom model.")}</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      <Text size="xs" c="dimmed" mt={4}>
        {presets.length > 0
          ? t("ai.provider.preset_hint", "{{count}} preset models available, or type a custom model name", { count: presets.length })
          : t("ai.provider.custom_model_hint", "Type a model name (e.g. gpt-4o, claude-sonnet-4-20250514)")}
      </Text>
    </Box>
  );
}

export function AiProviderFormModal({ provider, onSuccess }: AiProviderFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(provider?.name || "");
  const [type, setType] = useState<AiProviderType>(provider?.type || "mimo");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "");
  const [modelName, setModelName] = useState(provider?.modelName || "");
  const [isDefault, setIsDefault] = useState(provider?.isDefault || false);
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [presets, setPresets] = useState<string[]>(MODEL_PRESETS[provider?.type || "mimo"] || []);

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
      setPresets(MODEL_PRESETS[type] || []);
    }
  }, [type, isEditing]);

  const handleFetchModels = useCallback(async () => {
    setFetchingModels(true);
    try {
      const result = await fetchProviderModels(type, apiKey || undefined, baseUrl || undefined);
      if (result.models && result.models.length > 0) {
        setPresets(result.models);
        notifications.show({
          title: t("Success"),
          message: t("ai.provider.fetch_models_success", "Fetched {{count}} available models", { count: result.models.length }),
          color: "green",
        });
      } else {
        notifications.show({
          title: t("Notice"),
          message: t("ai.provider.fetch_models_empty", "No models returned. Please enter a model name manually."),
          color: "yellow",
        });
      }
    } catch (error: any) {
      notifications.show({
        title: t("ai.provider.fetch_models_error", "Failed to fetch models"),
        message: error.message || t("Please check your API Key and Base URL, or enter a model name directly"),
        color: "red",
      });
    } finally {
      setFetchingModels(false);
    }
  }, [type, apiKey, baseUrl]);

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
        placeholder="e.g., My OpenAI Provider"
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

      <TextInput
        label="Base URL"
        placeholder="e.g., https://api.openai.com/v1"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.currentTarget.value)}
      />

      <PasswordInput
        label="API Key"
        placeholder={isEditing ? "Leave blank to keep current key" : "Enter your API key"}
        value={apiKey}
        onChange={(e) => setApiKey(e.currentTarget.value)}
      />

      <ModelSelect
        presets={presets}
        value={modelName}
        onChange={setModelName}
        loading={fetchingModels}
        onFetchModels={handleFetchModels}
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
          ? t("ai.provider.ollama_note", "Ollama runs locally. Make sure your Ollama server is running and accessible.")
          : t("ai.provider.storage_note", "Your API key will be stored securely and used only for AI requests.")}
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
