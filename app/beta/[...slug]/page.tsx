import { promises as fs } from 'fs';
import path from 'path';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function BetaPage({ params }: PageProps) {
  const { slug } = await params;

  // Handle assets
  if (slug && slug.includes('assets')) {
    const assetPath = path.join(process.cwd(), 'public', 'beta', ...slug);
    try {
      const content = await fs.readFile(assetPath, 'utf-8');
      return new Response(content, {
        headers: {
          'Content-Type': slug[slug.length - 1].endsWith('.js') ? 'application/javascript' : 'text/plain',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  }

  const filePath = path.join(process.cwd(), 'public', 'beta', ...(slug || ['index.html']));

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // If it's an HTML file, return it as HTML
    if (filePath.endsWith('.html')) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ width: '100%', height: '100vh', overflow: 'auto' }}
        />
      );
    }

    // For other files, return as text
    return <pre>{content}</pre>;
  } catch (error) {
    console.error('Error reading beta file:', error);
    return (
      <div>
        <h1>404 - File Not Found</h1>
        <p>Could not find file: {filePath}</p>
      </div>
    );
  }
}