import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

export const wagmiConfig = getDefaultConfig({
  appName: "Telegraph Hackathon Submissions",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "telegraph-hackathon-submissions",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(import.meta.env.VITE_RPC_URL || "https://sepolia.base.org"),
  },
});
