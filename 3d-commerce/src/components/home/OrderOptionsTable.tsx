import { ORDER_OPTIONS } from "@/lib/aeo-content.mjs";

/**
 * Comparison of the three ways to order, rendered inside the FAQ answer for
 * "What is the difference between ready-made, custom and bulk orders?".
 * The rows come from the same ORDER_OPTIONS that feed /llms-full.txt and /about.
 */
export function OrderOptionsTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs leading-5 sm:text-sm sm:leading-6">
        <caption className="sr-only">Comparison of ready-made, custom and bulk orders at Voxel3D</caption>
        <thead className="bg-surface text-foreground">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">Order type</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Best for</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">What you provide</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">What happens next</th>
          </tr>
        </thead>
        <tbody className="text-muted">
          {ORDER_OPTIONS.map((row) => (
            <tr key={row.option} className="border-t border-border align-top">
              <th scope="row" className="px-3 py-2.5 font-semibold text-foreground">{row.option}</th>
              <td className="px-3 py-2.5">{row.bestFor}</td>
              <td className="px-3 py-2.5">{row.youProvide}</td>
              <td className="px-3 py-2.5">{row.nextStep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
