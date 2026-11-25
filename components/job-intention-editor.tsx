"use client"

import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ResumeData } from "@/types/resume"

interface JobIntentionEditorProps {
  value?: ResumeData["jobIntention"]
  onChange: (value: NonNullable<ResumeData["jobIntention"]>) => void
}
const createDefaults = () =>
  ["工作年限", "求职岗位", "目标城市", "期望薪资"].map((label) => ({
    id: crypto.randomUUID(),
    label,
    value: "",
  }))

export default function JobIntentionEditor({
  value,
  onChange,
}: JobIntentionEditorProps) {
  const items = value?.items || []
  return (
    <Card className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:bullseye-arrow" className="h-5 w-5 text-primary" />
          <h2 className="section-title">求职意向</h2>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value?.enabled || false}
            onChange={(event) =>
              onChange({
                enabled: event.target.checked,
                items: value?.items || createDefaults(),
              })
            }
          />
          显示求职意向
        </label>
      </div>
      {value?.enabled && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2">
              <Input
                aria-label="意向标签"
                className="w-28 shrink-0"
                maxLength={100}
                value={item.label}
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: items.map((current) =>
                      current.id === item.id
                        ? { ...current, label: event.target.value }
                        : current,
                    ),
                  })
                }
              />
              <Input
                aria-label={item.label || "意向内容"}
                className="min-w-0"
                maxLength={500}
                value={item.value}
                placeholder="请输入内容"
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: items.map((current) =>
                      current.id === item.id
                        ? { ...current, value: event.target.value }
                        : current,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label={`删除意向 ${item.label}`}
                onClick={() =>
                  onChange({
                    ...value,
                    items: items.filter((current) => current.id !== item.id),
                  })
                }
              >
                <Icon icon="mdi:delete-outline" className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={items.length >= 20}
            className="gap-1"
            onClick={() =>
              onChange({
                ...value,
                items: [
                  ...items,
                  { id: crypto.randomUUID(), label: "自定义", value: "" },
                ],
              })
            }
          >
            <Icon icon="mdi:plus" className="h-4 w-4" />
            添加意向
          </Button>
        </div>
      )}
    </Card>
  )
}
