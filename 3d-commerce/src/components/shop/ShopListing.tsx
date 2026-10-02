import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { fetchShopPage } from "@/lib/shop-api";
import { parseShopSearchParams } from "@/lib/shop-query";

interface ShopListingProps { searchParams: Record<string,string|string[]|undefined>; lockedCategory?: string; basePath: string; }
export async function ShopListing({searchParams,lockedCategory,basePath}: ShopListingProps) {
 const state=parseShopSearchParams(searchParams); const result=await fetchShopPage(state,lockedCategory);
 return <ShopProductGrid key={basePath+"|"+JSON.stringify(searchParams)} result={result} state={state} lockedCategory={lockedCategory} basePath={basePath}/>;
}
