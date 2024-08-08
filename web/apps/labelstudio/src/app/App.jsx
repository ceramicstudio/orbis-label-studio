/* global Sentry */

import { createBrowserHistory } from "history";
import { render } from "react-dom";
import { Router } from "react-router-dom";
import {
  LEAVE_BLOCKER_KEY,
  leaveBlockerCallback,
} from "../components/LeaveBlocker/LeaveBlocker";
import { initSentry } from "../config/Sentry";
import { ApiProvider } from "../providers/ApiProvider";
import { AppStoreProvider } from "../providers/AppStoreProvider";
import { ConfigProvider } from "../providers/ConfigProvider";
import { LibraryProvider } from "../providers/LibraryProvider";
import { MultiProvider } from "../providers/MultiProvider";
import { ProjectProvider } from "../providers/ProjectProvider";
import { RoutesProvider } from "../providers/RoutesProvider";
import {
  DRAFT_GUARD_KEY,
  DraftGuard,
  draftGuardCallback,
} from "../components/DraftGuard/DraftGuard";
import "./App.styl";
import { AsyncPage } from "./AsyncPage/AsyncPage";
import ErrorBoundary from "./ErrorBoundary";
import { RootPage } from "./RootPage";
import { FF_OPTIC_2, FF_UNSAVED_CHANGES, isFF } from "../utils/feature-flags";
import { ToastProvider, ToastViewport } from "../components/Toast/Toast";
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  goerli,
} from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { PrivyProvider, useWallets, usePrivy } from "@privy-io/react-auth";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  OrbisDB,
} from "@useorbis/db-sdk";
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { useWalletClient } from "wagmi";


const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    zora,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true" ? [goerli] : []),
  ],
  [publicProvider()]
);

const projectId = "86e78deb6cf634c706f45426dd186bf7";

const { wallets } = getDefaultWallets({
  appName: "RainbowKit demo",
  projectId,
  chains,
});

const demoAppInfo = {
  appName: "Rainbowkit Demo",
};

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: "Other",
    wallets: [
      argentWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      ledgerWallet({ projectId, chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

const baseURL = new URL(APP_SETTINGS.hostname || location.origin);
export const UNBLOCK_HISTORY_MESSAGE = "UNBLOCK_HISTORY";

const orbis = new OrbisDB({
  ceramic: {
    gateway: "https://ceramic-orbisdb-mainnet-direct.hirenodes.io/",
  },
  nodes: [
    {
      gateway: "https://studio.useorbis.com",
      env: "did:pkh:eip155:1:0x06801184306b5eb8162497b8093395c1dfd2e8d8"
    },
  ],
});

let isAuthenticated = false;

const Context = createContext({ orbis, isAuthenticated });

export const ODB = ({ children }) => {
  function StartAuth() {
    const { data: walletClient } = useWalletClient();
    const [isAuth, setAuth] = useState(false);
    const {wallets} = useWallets();
    const {ready, authenticated, login, logout} = usePrivy();

    useEffect(() => {
      const StartOrbisAuth = async () => {
        const auth = new OrbisEVMAuth(window.ethereum);
        // Authenticate - this option persists the session in local storage
        const authResult = await orbis.connectUser({
          auth,
        });
        if (authResult.session) {
          console.log("Orbis Auth'd:", authResult.session);
          return authResult;
        }

        return undefined;
      };
      if(ready && authenticated) {
        console.log(wallets);
      }
      // Only run this if the wallet client is available
      if (walletClient) {
        const address = walletClient.account.address;
        if (localStorage.getItem("orbis:session") && address) {
          const attestation = (
            JSON.parse(
              localStorage.getItem("orbis:session") ?? "{}",
            )
          ).session.authAttestation;
          const expTime = attestation.siwx.message.expirationTime;
          if (
            attestation.siwx.message.address.toLowerCase() !==
            address.toLowerCase()
          ) {
            localStorage.removeItem("orbis:session");
          }
          //@ts-expect-error - TS doesn't know about the expirationTime field
          else if (expTime > Date.now()) {
            localStorage.removeItem("orbis:session");
          } else {
            setAuth(true);
            isAuthenticated = true;
          }
        }
        if (!isAuthenticated) {
          StartOrbisAuth().then((authResult) => {
            if (authResult) {
              setAuth(true);
              isAuthenticated = true;
            }
          });
        }
        orbis.getConnectedUser().then((user) => {
          console.log("Connected User:", user);
        });
      } 
    }, [isAuth, walletClient, ready, authenticated]);

    return isAuth;
  }

  if (!isAuthenticated) {
    isAuthenticated = StartAuth();
  }

  return (
    <Context.Provider value={{ orbis, isAuthenticated }}>
      {children}
    </Context.Provider>
  );
};

export const useODB = () => useContext(Context);

const browserHistory = createBrowserHistory({
  basename: baseURL.pathname || "/",
  // callback is an async way to confirm or decline going to another page in the context of routing. It accepts `true` or `false`
  getUserConfirmation: (message, callback) => {
    // `history.block` doesn't block events, so in the case of listeners,
    // we need to have some flag that can be checked for preventing related actions
    // `isBlocking` flag is used for this purpose
    browserHistory.isBlocking = true;
    const callbackWrapper = (result) => {
      browserHistory.isBlocking = false;
      callback(result);
      isFF(FF_UNSAVED_CHANGES) &&
        window.postMessage({
          source: "label-studio",
          payload: UNBLOCK_HISTORY_MESSAGE,
        });
    };
    if (isFF(FF_OPTIC_2) && message === DRAFT_GUARD_KEY) {
      draftGuardCallback.current = callbackWrapper;
    } else if (isFF(FF_UNSAVED_CHANGES) && message === LEAVE_BLOCKER_KEY) {
      leaveBlockerCallback.current = callbackWrapper;
    } else {
      callbackWrapper(window.confirm(message));
    }
  },
});

window.LSH = browserHistory;

initSentry(browserHistory);

const App = ({ content }) => {
  const libraries = {
    lsf: {
      scriptSrc: window.EDITOR_JS,
      cssSrc: window.EDITOR_CSS,
      checkAvailability: () => !!window.LabelStudio,
    },
    dm: {
      scriptSrc: window.DM_JS,
      cssSrc: window.DM_CSS,
      checkAvailability: () => !!window.DataManager,
    },
  };

  return (
    <ErrorBoundary>
      <Router history={browserHistory}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider chains={chains} appInfo={demoAppInfo}>
            <PrivyProvider
              appId={process.env.PRIVY_ID}
              config={{
                // Customize Privy's appearance in your app
                loginMethods: ['email', 'wallet', 'google', 'apple', 'farcaster'], 
                appearance: {
                  theme: "light",
                  accentColor: "#676FFF",
                  logo: "https://your-logo-url",
                },
                // Create embedded wallets for users who don't have a wallet
                embeddedWallets: {
                  createOnLogin: "users-without-wallets",
                },
              }}
            >
              <ODB>
              <MultiProvider
                providers={[
                  <AppStoreProvider key="app-store" />,
                  <ApiProvider key="api" />,
                  <ConfigProvider key="config" />,
                  <LibraryProvider key="lsf" libraries={libraries} />,
                  <RoutesProvider key="rotes" />,
                  <ProjectProvider key="project" />,
                  <ToastProvider key="toast" />,
                ]}
              >
                <AsyncPage>
                  <DraftGuard />
                  <RootPage content={content} />
                  <ToastViewport />
                </AsyncPage>
              </MultiProvider>
              </ODB>
            </PrivyProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </Router>
    </ErrorBoundary>
  );
};

const root = document.querySelector(".app-wrapper");
const content = document.querySelector("#main-content");

render(<App content={content.innerHTML} />, root);
