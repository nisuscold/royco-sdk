import { defineMarket } from "@/sdk/constants";

export default defineMarket({
  id: `1_0_0x6b3dfac03cea102e59d2d5711088f3001782e07239dcc90f274dd9762220c49a`,
  name: `Beraborrow ylrsETH Boyco`,
  description: `Single sided Liquid Stability Pool: 
Deposit ylrsETH into Boyco. ylrsETH is bridged &amp; deposited into Beraborrow. ylrsETH is then used to mint NECT at 300% collateral ratio, and then NECT is supplied into the Liquid Stability Pool.
This is part of Berachain Boyco pre-deposit campaign.`,
  is_verified: false,
  category: `boyco`,
  external_incentives: [
    {
      token_id: "1-0xfbca1de031ac44e83850634c098f22137e4647e5",
      label: "LSP Yield",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Variable Rate";
        return value;
      },
    },
    {
      token_id: "1-0x3b2635c5d5cc5cee62b9084636f808c67da9988f",
      label: "Infrared Yield",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Retrodrop";
        return value;
      },
    },
    {
      token_id: "1-0xb000000000000000000000000000000000000ccc",
      label: "Cian Points",

      value: async ({ roycoClient, chainClient }) => {
        const value = "2x";
        return value;
      },
    },
  ],
});
