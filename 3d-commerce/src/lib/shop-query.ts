export type ShopSortValue="featured"|"newest"|"price-low"|"price-high"|"rating"|"popular";
export interface ShopQueryState{page:number;sort:ShopSortValue;q:string;categories:string[];minPrice:number;maxPrice:number;minRating:number}
export const SHOP_PAGE_SIZE=12;
const SORTS:ShopSortValue[]=["featured","newest","price-low","price-high","rating","popular"];
export const DEFAULT_SHOP_QUERY:ShopQueryState={page:1,sort:"featured",q:"",categories:[],minPrice:0,maxPrice:Infinity,minRating:0};
type RawParams=Record<string,string|string[]|undefined>;
const first=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;
const num=(v:string|undefined,f:number)=>{if(v===undefined||v==="")return f;const n=Number(v);return Number.isFinite(n)?n:f};
export function parseShopSearchParams(p:RawParams):ShopQueryState{const sort=first(p.sort),category=first(p.category);return{page:Math.max(1,Math.trunc(num(first(p.page),1))),sort:SORTS.includes(sort as ShopSortValue)?sort as ShopSortValue:"featured",q:(first(p.q)??first(p.search)??"").slice(0,100),categories:category?category.split(",").map(x=>x.trim()).filter(Boolean):[],minPrice:Math.max(0,num(first(p.minPrice),0)),maxPrice:num(first(p.maxPrice),Infinity),minRating:Math.max(0,num(first(p.minRating),0))}}
export function buildShopSearch(s:ShopQueryState,o:{omitCategory?:boolean}={}):string{const p=new URLSearchParams();if(s.q.trim())p.set("q",s.q.trim());if(!o.omitCategory&&s.categories.length)p.set("category",s.categories.join(","));if(s.minPrice>0)p.set("minPrice",String(s.minPrice));if(Number.isFinite(s.maxPrice))p.set("maxPrice",String(s.maxPrice));if(s.minRating>0)p.set("minRating",String(s.minRating));if(s.sort!=="featured")p.set("sort",s.sort);if(s.page>1)p.set("page",String(s.page));const q=p.toString();return q?"?"+q:""}
