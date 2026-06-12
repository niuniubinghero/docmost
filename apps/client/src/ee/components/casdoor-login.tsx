import { Button } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";
import { useWorkspacePublicDataQuery } from "@/features/workspace/queries/workspace-query.ts";

export default function CasdoorLogin() {
  const { data } = useWorkspacePublicDataQuery();

  const handleCasdoorLogin = () => {
    const workspaceId = data?.id;
    if (workspaceId) {
      window.location.href = `/auth/casdoor/login?workspaceId=${workspaceId}`;
    }
  };

  return (
    <Button
      onClick={handleCasdoorLogin}
      leftSection={<IconLogin size={16} />}
      variant="default"
      fullWidth
    >
      Sign in with Casdoor
    </Button>
  );
}
