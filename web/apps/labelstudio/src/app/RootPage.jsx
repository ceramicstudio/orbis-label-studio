import React from "react";
import { Menubar } from "../components/Menubar/Menubar";
import { ProjectRoutes } from "../routes/ProjectRoutes";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { OrbisDB } from "@useorbis/db-sdk";
import { OrbisKeyDidAuth, OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import "@rainbow-me/rainbowkit/styles.css";

export const orbis = new OrbisDB({
  ceramic: {
    gateway: process.env.CERAMIC_GATEWAY,
  },
  nodes: [
    {
      gateway: process.env.ORBIS_GATEWAY,
      env: process.env.ENV_ID,
    },
  ],
});

export const RootPage = ({ content }) => {
  const pinned = localStorage.getItem("sidebar-pinned") === "true";
  const opened = pinned && localStorage.getItem("sidebar-opened") === "true";
  const {
    ready,
    authenticated,
    login,
    logout,
    createWallet,
    user,
  } = usePrivy();
  const { wallets } = useWallets();

  const createSession = async () => {
    const session = localStorage.getItem("orbis:session");
    if (!session && wallets[0]) {
      const provider = await wallets[0].getEthereumProvider();
      const auth = new OrbisEVMAuth(provider);
      const authResult = await orbis.connectUser({
        auth,
      });
      if (authResult.auth.session) {
        console.log("Orbis Auth'd:", authResult.auth.session);
        return authResult;
      }
    }
  };

  const create = async () => {
    if (!user?.wallet?.address) {
      await createWallet();
    }
    await createSession();
  };

  React.useEffect(() => {
    if (authenticated && ready) {
      create();
    } else if (!authenticated && ready) {
      localStorage.removeItem("orbis:session");
    }
  }, [authenticated, ready, wallets]);

  return (
    <Menubar
      enabled={true}
      defaultOpened={opened}
      defaultPinned={pinned}
      onSidebarToggle={(visible) =>
        localStorage.setItem("sidebar-opened", visible)
      }
      onSidebarPin={(pinned) => localStorage.setItem("sidebar-pinned", pinned)}
    >
      <ProjectRoutes content={content} />
    </Menubar>
  );
};
