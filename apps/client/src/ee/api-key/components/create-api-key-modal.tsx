import { lazy, Suspense, useState } from "react";
import { Modal, TextInput, Button, Group, Stack, Select, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";
import { useTranslation } from "react-i18next";
import { useCreateApiKeyMutation } from "@/ee/api-key/queries/api-key-query";
import { IconCalendar } from "@tabler/icons-react";
import { IApiKey } from "@/ee/api-key";

const SCOPE_OPTIONS = [
  { value: "page:read", label: "页面读取" },
  { value: "space:read", label: "空间读取" },
  { value: "search:read", label: "搜索" },
];

const DateInput = lazy(() =>
  import("@mantine/dates").then((module) => ({
    default: module.DateInput,
  })),
);

interface CreateApiKeyModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: (response: IApiKey) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function CreateApiKeyModal({
  opened,
  onClose,
  onSuccess,
}: CreateApiKeyModalProps) {
  const { t, i18n } = useTranslation();
  const [expirationOption, setExpirationOption] = useState<string>("30");
  const [scopes, setScopes] = useState<string[]>([]);
  const createApiKeyMutation = useCreateApiKeyMutation();

  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: {
      name: "",
      expiresAt: "",
    },
  });

  const getExpirationDate = (): string | undefined => {
    if (expirationOption === "never") {
      return undefined;
    }
    if (expirationOption === "custom") {
      return form.values.expiresAt;
    }
    const days = parseInt(expirationOption);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const getExpirationLabel = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const formatted = date.toLocaleDateString(i18n.language, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    return `${days} days (${formatted})`;
  };

  const expirationOptions = [
    { value: "30", label: getExpirationLabel(30) },
    { value: "60", label: getExpirationLabel(60) },
    { value: "90", label: getExpirationLabel(90) },
    { value: "365", label: getExpirationLabel(365) },
    { value: "custom", label: t("Custom") },
    { value: "never", label: t("No expiration") },
  ];

  const handleSubmit = async (data: {
    name?: string;
    expiresAt?: string | Date;
  }) => {
    const groupData = {
      name: data.name,
      expiresAt: getExpirationDate(),
      scopes: scopes.length > 0 ? scopes : null,
    };

    try {
      const createdKey = await createApiKeyMutation.mutateAsync(groupData);
      onSuccess(createdKey);
      form.reset();
      setScopes([]);
      onClose();
    } catch (err) {
      //
    }
  };

  const handleClose = () => {
    form.reset();
    setExpirationOption("30");
    setScopes([]);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("Create {{credential}}", { credential: t("API key") })}
      size="md"
      closeButtonProps={{ "aria-label": t("Close") }}
    >
      <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
        <Stack gap="md">
          <TextInput
            label={t("Name")}
            placeholder={t("Enter a descriptive name")}
            data-autofocus
            required
            {...form.getInputProps("name")}
          />

          <Select
            label={t("Expiration")}
            data={expirationOptions}
            value={expirationOption}
            onChange={(value) => setExpirationOption(value || "30")}
            leftSection={<IconCalendar size={16} />}
            allowDeselect={false}
          />

          {expirationOption === "custom" && (
            <Suspense fallback={null}>
              <DateInput
                label={t("Custom expiration date")}
                placeholder={t("Select expiration date")}
                minDate={new Date()}
                {...form.getInputProps("expiresAt")}
              />
            </Suspense>
          )}

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
            <Button variant="default" onClick={handleClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={createApiKeyMutation.isPending}>
              {t("Create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
