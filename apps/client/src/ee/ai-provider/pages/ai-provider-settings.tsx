import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Group,
  Text,
  Title,
  Stack,
  Card,
  Badge,
  ActionIcon,
  Menu,
  Switch,
  Loader,
  Center,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconDots, IconPencil, IconTrash, IconStar, IconStarFilled, IconPlug } from "@tabler/icons-react";
import {
  getAiProviders,
  deleteAiProvider,
  setDefaultAiProvider,
  testAiProviderConnection,
} from "@/ee/ai-provider/services/ai-provider-service";
import type { AiProvider, AiProviderType } from "@/ee/ai-provider/types/ai-provider.types";
import { AI_PROVIDER_TYPE_LABELS } from "@/ee/ai-provider/types/ai-provider.types";
import { AiProviderFormModal } from "@/ee/ai-provider/components/ai-provider-form";

export default function AiProviderSettings() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAiProviders();
      setProviders(data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load AI providers",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleDelete = async (providerId: string) => {
    try {
      await deleteAiProvider(providerId);
      notifications.show({
        title: "Success",
        message: "AI provider deleted",
        color: "green",
      });
      loadProviders();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete AI provider",
        color: "red",
      });
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      await setDefaultAiProvider(providerId);
      notifications.show({
        title: "Success",
        message: "Default provider updated",
        color: "green",
      });
      loadProviders();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to set default provider",
        color: "red",
      });
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTesting(providerId);
      const result = await testAiProviderConnection(providerId);
      if (result.success) {
        notifications.show({
          title: "Connection Successful",
          message: `Response: ${result.response}`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Connection Failed",
          message: result.error || "Unknown error",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to test connection",
        color: "red",
      });
    } finally {
      setTesting(null);
    }
  };

  const openCreateModal = () => {
    modals.open({
      title: "Add AI Provider",
      size: "lg",
      children: <AiProviderFormModal onSuccess={() => { loadProviders(); modals.closeAll(); }} />,
    });
  };

  const openEditModal = (provider: AiProvider) => {
    modals.open({
      title: "Edit AI Provider",
      size: "lg",
      children: <AiProviderFormModal provider={provider} onSuccess={() => { loadProviders(); modals.closeAll(); }} />,
    });
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3}>AI Providers</Title>
          <Text c="dimmed" size="sm">
            Configure AI providers for your workspace. These providers will be available for AI chat, content generation, and search.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Add Provider
        </Button>
      </Group>

      {providers.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Text c="dimmed">No AI providers configured yet. Click "Add Provider" to get started.</Text>
        </Card>
      ) : (
        <Stack gap="md">
          {providers.map((provider) => (
            <Card key={provider.id} withBorder p="md">
              <Group justify="space-between">
                <Group>
                  <div>
                    <Group gap="xs">
                      <Text fw={500}>{provider.name}</Text>
                      {provider.isDefault && (
                        <Badge color="blue" size="sm">Default</Badge>
                      )}
                      <Badge color={provider.isActive ? "green" : "gray"} size="sm">
                        {provider.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {AI_PROVIDER_TYPE_LABELS[provider.type]} · {provider.modelName}
                    </Text>
                    {provider.baseUrl && (
                      <Text size="xs" c="dimmed" truncate maw={400}>
                        {provider.baseUrl}
                      </Text>
                    )}
                  </div>
                </Group>

                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    loading={testing === provider.id}
                    onClick={() => handleTest(provider.id)}
                    leftSection={<IconPlug size={14} />}
                  >
                    Test
                  </Button>

                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => openEditModal(provider)}
                      >
                        Edit
                      </Menu.Item>
                      {!provider.isDefault && (
                        <Menu.Item
                          leftSection={<IconStar size={14} />}
                          onClick={() => handleSetDefault(provider.id)}
                        >
                          Set as Default
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => {
                          modals.open({
                            title: "Delete Provider",
                            children: (
                              <Box>
                                <Text mb="md">
                                  Are you sure you want to delete "{provider.name}"?
                                </Text>
                                <Group justify="flex-end">
                                  <Button variant="default" onClick={() => modals.closeAll()}>
                                    Cancel
                                  </Button>
                                  <Button
                                    color="red"
                                    onClick={() => {
                                      handleDelete(provider.id);
                                      modals.closeAll();
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </Group>
                              </Box>
                            ),
                          });
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
