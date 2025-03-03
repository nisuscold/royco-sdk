import type { TypedRoycoClient } from "@/sdk/client";
import type {
  BaseQueryFilter,
  BaseSortingFilter,
  CustomTokenData,
  Database,
} from "@/sdk/types";
import type { SupportedToken } from "@/sdk/constants";

import { getSupportedToken } from "@/sdk/constants";
import {
  constructBaseSortingFilterClauses,
  parseRawAmount,
  parseRawAmountToTokenAmount,
  parseTokenAmountToTokenAmountUsd,
} from "@/sdk/utils";

export const constructEnrichedPositionsRecipeFilterClauses = (
  filters: Array<BaseQueryFilter> | undefined,
): string | undefined => {
  if (!filters) return undefined;

  let offerSideFilter = "";
  let canWithdrawFilter = "";
  let canClaimFilter = "";

  /**
   * @note To filter string: wrap in single quotes
   * @note To filter number: no quotes
   */
  // filters.forEach((filter, filterIndex) => {
  //   filterClauses += ` ${filter.id} = ${filter.value} `;

  //   if (filterIndex !== filters.length - 1) {
  //     filterClauses += ` ${filter.join ?? "OR"} `;
  //   }
  // });

  filters.forEach((filter) => {
    switch (filter.id) {
      case "offer_side":
        if (offerSideFilter) offerSideFilter += " OR ";
        if (filter.condition === "NOT") {
          offerSideFilter += ` offer_side <> ${filter.value} `;
        } else {
          offerSideFilter += ` offer_side = ${filter.value} `;
        }
        break;
      case "can_withdraw":
        if (canWithdrawFilter) canWithdrawFilter += " OR ";
        if (filter.condition === "NOT") {
          canWithdrawFilter += ` can_withdraw <> ${filter.value} `;
        } else {
          canWithdrawFilter += ` can_withdraw = ${filter.value} `;
        }
        break;
      case "can_claim":
        if (canClaimFilter) canClaimFilter += " OR ";
        if (filter.condition === "NOT") {
          canClaimFilter += ` can_claim <> ${filter.value} `;
        } else {
          canClaimFilter += ` can_claim = ${filter.value} `;
        }
        break;
    }
  });

  let filterClauses = "";

  if (offerSideFilter) filterClauses += `(${offerSideFilter}) AND `;
  if (canWithdrawFilter) filterClauses += `(${canWithdrawFilter}) AND `;
  if (canClaimFilter) filterClauses += `(${canClaimFilter}) AND `;

  if (filterClauses) {
    filterClauses = filterClauses.slice(0, -5); // Remove the trailing " AND "
  }

  return filterClauses;
};

export type EnrichedPositionsRecipeDataType =
  Database["public"]["CompositeTypes"]["enriched_positions_recipe_data_type"] & {
    tokens_data: Array<
      SupportedToken & {
        raw_amount: string;
        token_amount: number;
        token_amount_usd: number;
        price: number;
        fdv: number;
        total_supply: number;
      }
    >;
    input_token_data: SupportedToken & {
      raw_amount: string;
      token_amount: number;
      token_amount_usd: number;
      price: number;
      fdv: number;
      total_supply: number;
    };
    annual_change_ratio: number;
  };

export type GetEnrichedPositionsRecipeQueryParams = {
  account_address: string;
  chain_id?: number;
  market_id?: string;
  custom_token_data?: CustomTokenData;
  page_index?: number;
  page_size?: number;
  filters?: Array<BaseQueryFilter>;
  sorting?: Array<BaseSortingFilter>;
};

export type GetEnrichedPositionsRecipeQueryOptionsParams =
  GetEnrichedPositionsRecipeQueryParams & {
    client: TypedRoycoClient;
  };

export const getEnrichedPositionsRecipeQueryFunction = async ({
  client,
  account_address,
  chain_id,
  market_id,
  custom_token_data,
  page_index,
  page_size,
  filters,
  sorting,
}: GetEnrichedPositionsRecipeQueryOptionsParams) => {
  const filter_clauses = constructEnrichedPositionsRecipeFilterClauses(filters);
  const sorting_clauses = constructBaseSortingFilterClauses(sorting);

  const result = await client.rpc("get_enriched_positions_recipe", {
    account_address,
    chain_id,
    market_id,
    custom_token_data,
    page_index,
    page_size,
    filters: filter_clauses,
    sorting: sorting_clauses,
  });

  if (!!result.data && !!result.data.data && result.data.data.length > 0) {
    const rows = result.data.data;

    const new_rows = rows
      .map((row) => {
        if (
          !!row.input_token_id &&
          !!row.token_ids &&
          !!row.token_amounts &&
          !!row.protocol_fee_amounts &&
          !!row.frontend_fee_amounts
        ) {
          const tokens_data = row.token_ids.map((tokenId, tokenIndex) => {
            const token_price: number = row.token_price_values
              ? (row.token_price_values[tokenIndex] ?? 0)
              : 0;
            const token_fdv: number = row.token_fdv_values
              ? (row.token_fdv_values[tokenIndex] ?? 0)
              : 0;
            const token_total_supply: number = row.token_total_supply_values
              ? (row.token_total_supply_values[tokenIndex] ?? 0)
              : 0;

            const token_info: SupportedToken = getSupportedToken(tokenId);

            const raw_amount: string = parseRawAmount(
              row.token_amounts && row.token_amounts[tokenIndex],
            );

            const token_amount: number = parseRawAmountToTokenAmount(
              raw_amount,
              token_info.decimals,
            );

            const token_amount_usd = parseTokenAmountToTokenAmountUsd(
              token_amount,
              token_price,
            );

            return {
              ...token_info,
              raw_amount,
              token_amount,
              token_amount_usd,
              price: token_price,
              fdv: token_fdv,
              total_supply: token_total_supply,
            };
          });

          const input_token_info: SupportedToken = getSupportedToken(
            row.input_token_id,
          );
          const input_token_price: number = row.input_token_price ?? 0;
          const input_token_fdv: number = row.input_token_fdv ?? 0;
          const input_token_total_supply: number =
            row.input_token_total_supply ?? 0;
          const input_token_raw_amount: string = parseRawAmount(row.quantity);

          const input_token_token_amount: number = parseRawAmountToTokenAmount(
            input_token_raw_amount,
            input_token_info.decimals,
          );

          const input_token_token_amount_usd = parseTokenAmountToTokenAmountUsd(
            input_token_token_amount,
            input_token_price,
          );

          const input_token_data = {
            ...input_token_info,
            raw_amount: input_token_raw_amount,
            token_amount: input_token_token_amount,
            token_amount_usd: input_token_token_amount_usd,
            price: input_token_price,
            fdv: input_token_fdv,
            total_supply: input_token_total_supply,
          };

          const lockup_time = Number(row.lockup_time ?? 0);

          const quantity_value_usd = input_token_data.token_amount_usd;
          const incentive_value_usd = tokens_data.reduce(
            (acc, token) => acc + token.token_amount_usd,
            0,
          );

          let annual_change_ratio = 0;

          if (
            quantity_value_usd > 0 &&
            !isNaN(lockup_time) &&
            lockup_time > 0
          ) {
            annual_change_ratio =
              ((incentive_value_usd / quantity_value_usd) *
                (365 * 24 * 60 * 60)) /
              lockup_time;
          }

          return {
            ...row,
            tokens_data,
            input_token_data,
            annual_change_ratio,
          };
        }

        return null;
      })
      .filter((row) => !!row);

    return {
      count: result.data.count ?? 0,
      data: new_rows as Array<EnrichedPositionsRecipeDataType> | null,
    };
  }

  return {
    count: 0,
    data: null as Array<EnrichedPositionsRecipeDataType> | null,
  };
};

export const getEnrichedPositionsRecipeQueryOptions = ({
  client,
  account_address,
  chain_id,
  market_id,
  custom_token_data,
  page_index = 0,
  page_size = 20,
  filters = [],
  sorting = [],
}: GetEnrichedPositionsRecipeQueryOptionsParams) => ({
  queryKey: [
    "get-enriched-positions-recipe",
    {
      account_address,
      chain_id,
      market_id,
      custom_token_data,
      page_index,
      page_size,
      filters,
      sorting,
    },
  ],
  queryFn: () =>
    getEnrichedPositionsRecipeQueryFunction({
      client,
      account_address,
      chain_id,
      market_id,
      custom_token_data,
      page_index,
      page_size,
      filters,
      sorting,
    }),

  placeholderData: (previousData: any) => previousData,
  refetchInterval: 1000 * 60 * 10, // 10 mins
  refetchOnWindowFocus: false,
});
