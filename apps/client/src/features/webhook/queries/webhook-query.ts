import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import {
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  updateWebhook,
} from "@/features/webhook/services/webhook-service";
import {
  ICreateWebhookRequest,
  IUpdateWebhookRequest,
  IWebhook,
} from "@/features/webhook/types/webhook.types";

const WEBHOOK_LIST_KEY = "webhook-list";

export function useFetchWebhooks(): UseQueryResult<IWebhook[], Error> {
  return useQuery({
    queryKey: [WEBHOOK_LIST_KEY],
    queryFn: () => fetchWebhooks(),
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<IWebhook, Error, ICreateWebhookRequest>({
    mutationFn: (data) => createWebhook(data),
    onSuccess: () => {
      notifications.show({ message: t("Created successfully") });
      queryClient.invalidateQueries({
        predicate: (item) =>
          [WEBHOOK_LIST_KEY].includes(item.queryKey[0] as string),
      });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({ message: errorMessage, color: "red" });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<IWebhook, Error, IUpdateWebhookRequest>({
    mutationFn: (data) => updateWebhook(data),
    onSuccess: () => {
      notifications.show({ message: t("Updated successfully") });
      queryClient.invalidateQueries({
        predicate: (item) =>
          [WEBHOOK_LIST_KEY].includes(item.queryKey[0] as string),
      });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({ message: errorMessage, color: "red" });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, { id: string }>({
    mutationFn: (data) => deleteWebhook(data),
    onSuccess: () => {
      notifications.show({ message: t("Deleted successfully") });
      queryClient.invalidateQueries({
        predicate: (item) =>
          [WEBHOOK_LIST_KEY].includes(item.queryKey[0] as string),
      });
    },
    onError: (error) => {
      const errorMessage = error["response"]?.data?.message;
      notifications.show({ message: errorMessage, color: "red" });
    },
  });
}
