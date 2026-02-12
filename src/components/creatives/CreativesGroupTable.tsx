import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GROUP_BY_OPTIONS } from "./constants";

interface GroupRow {
  name: string;
  count: number;
  totalSpend: number;
  avgRoas: number;
  avgCpa: number;
  avgCtr: number;
}

interface CreativesGroupTableProps {
  groupBy: string;
  data: GroupRow[];
}

export function CreativesGroupTable({ groupBy, data }: CreativesGroupTableProps) {
  return (
    <div className="glass-panel overflow-hidden animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}</TableHead>
            <TableHead className="text-xs text-right">Count</TableHead>
            <TableHead className="text-xs text-right">Total Spend</TableHead>
            <TableHead className="text-xs text-right">Avg ROAS</TableHead>
            <TableHead className="text-xs text-right">Avg CPA</TableHead>
            <TableHead className="text-xs text-right">Avg CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((g) => (
            <TableRow key={g.name}>
              <TableCell className="text-xs font-medium">{g.name}</TableCell>
              <TableCell className="text-xs text-right">{g.count}</TableCell>
              <TableCell className="text-xs text-right">${g.totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</TableCell>
              <TableCell className="text-xs text-right">{g.avgRoas.toFixed(2)}x</TableCell>
              <TableCell className="text-xs text-right">${g.avgCpa.toFixed(2)}</TableCell>
              <TableCell className="text-xs text-right">{g.avgCtr.toFixed(2)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
