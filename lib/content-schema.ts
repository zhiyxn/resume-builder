import { z } from "zod"
import { sanitizeHtml } from "@/lib/html-safety"

export const contentRowsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(200),
        type: z.enum(["rich", "tags"]),
        columns: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
        cells: z
          .array(
            z.object({
              id: z.string().min(1).max(200),
              content: z.string().max(200000).transform(sanitizeHtml),
            }),
          )
          .max(4),
        tags: z.array(z.string().min(1).max(100)).max(20),
      })
      .refine(
        (row) =>
          row.type === "tags"
            ? row.columns === 1 && row.cells.length === 0
            : row.cells.length === row.columns,
        "Invalid row layout",
      )
      .refine(
        (row) =>
          new Set(row.cells.map((cell) => cell.id)).size === row.cells.length,
        "Duplicate cell IDs",
      ),
  )
  .max(100)
  .refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    "Duplicate row IDs",
  )

export const personalInfoLayoutSchema = z.object({
  mode: z.enum(["inline", "grid"]),
  columns: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  showLabels: z.boolean(),
})

export const jobIntentionSchema = z.object({
  enabled: z.boolean(),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        label: z.string().max(100),
        value: z.string().max(500),
        type: z.enum(["workYears", "position", "city", "salary", "custom"]).optional(),
        salaryRange: z.object({
          min: z.number().int().positive().max(100000).optional(),
          max: z.number().int().positive().max(100000).optional(),
        }).optional(),
      }),
    )
    .max(20),
})
