import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function BetaPage({ params }: PageProps) {
  const { slug = [] } = await params;
  const filePath = path.join(
    process.cwd(),
    "public",
    "beta",
    ...(slug.length ? slug : ["index.html"]),
  );

  try {
    const content = await fs.readFile(filePath, "utf-8");

    if (filePath.endsWith(".html")) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ width: "100%", height: "100vh", overflow: "auto" }}
        />
      );
    }

    return <pre>{content}</pre>;
  } catch (error) {
    console.error("Error reading beta file:", error);
    notFound();
  }
}
