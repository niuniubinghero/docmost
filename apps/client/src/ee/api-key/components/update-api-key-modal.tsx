import { Modal, TextInput, Button, Group, Stack, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";
import { useTranslation } from "react-i18next";
import { useUpdateApiKeyMutation } from "@/ee/api-key/queries/api-key-query";
import { IApiKey } from "@/ee/api-key";
import { useEffect, useState } from "react";

const SCOPE_OPTIONS = [
  { value: "page:read", label: "页面读取" },
  { value: "space:read", label: "空间读取" },
  { value: "search:read", label: "搜索" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
type FormValues = z.infer<typeof formSchema>;

interface UpdateApiKeyModalProps {
  opened: boolean;
  onClose: () => void;
  apiKey: IApiKey | null;
}

export function UpdateApiKeyModal({
  opened,
  onClose,
  apiKey,
}: UpdateApiKeyModalProps) {
  const { t } = useTranslation();
  const updateApiKeyMutation = useUpdateApiKeyMutation();
  const [scopes, setScopes] = useState<string[]>([]);

  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (opened && apiKey) {
      form.setValues({ name: apiKey.name });
      setScopes(Array.isArray(apiKey.scopes) ? apiKey.scopes : []);
    }
  }, [opened, apiKey]);

  const handleSubmit = async (data: { name?: string }) => {
    const apiKeyData = {
      apiKeyId: apiKey.id,
      name: data.name,
      scopes: scopes.length > 0 ? scopes : null,
    };

    await updateApiKeyMutation.mutateAsync(apiKeyData);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Update {{credential}}", { credential: t("API key") })}
      size="md"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
        <Stack gap="md">
          <TextInput
            label={t("Name")}
            placeholder={t("Enter a descriptive token name")}
            required
            {...form.getInputProps("name")}
          />

          <MultiSelect
            label={t("权限范围")}
            description={t("不选则拥有全部权限")}
            data={SCOPE_OPTIONS}
            value={scopes}
            onChange={setScopes}
            clearable
            searchable={false}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={updateApiKeyMutation.isPending}>
              {t("Update")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
