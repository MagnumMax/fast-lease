"use client";

import { useMemo, useState } from "react";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ARTICLES = [
  {
    id: "KB-101",
    title: "Как запросить повторную загрузку документов",
    category: "Client onboarding",
    updatedAt: "2024-07-02",
    tags: ["documents", "client", "automation"],
  },
  {
    id: "KB-086",
    title: "Скрипт подтверждения выдачи автомобиля",
    category: "Delivery",
    updatedAt: "2024-07-01",
    tags: ["delivery", "vehicle"],
  },
  {
    id: "KB-065",
    title: "FAQ: просроченные платежи и расчёт штрафов",
    category: "Finance",
    updatedAt: "2024-06-28",
    tags: ["finance", "penalty"],
  },
];

export default function SupportKnowledgePage() {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ARTICLES;
    return ARTICLES.filter((article) =>
      article.title.toLowerCase().includes(normalized) ||
      article.category.toLowerCase().includes(normalized) ||
      article.tags.some((tag) => tag.toLowerCase().includes(normalized)),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-linear">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Knowledge</p>
            <h1 className="text-2xl font-semibold text-foreground">База макросов</h1>
            <p className="text-sm text-muted-foreground">Последние обновления статей и скриптов.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск по тегам или заголовку"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
        </header>

        <div className="mt-6 grid gap-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="border border-dashed border-border bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <Badge variant="outline">{article.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Обновлено {article.updatedAt}</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">#{tag}</Badge>
                ))}
              </CardContent>
            </Card>
          ))}
          {filteredArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Совпадений не найдено</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
