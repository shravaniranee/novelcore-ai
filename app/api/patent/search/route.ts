import { NextResponse } from 'next/server';
import { getPatentProvider } from '@/lib/patent/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const domain = searchParams.get('domain') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const provider = getPatentProvider();
    const results = await provider.search({
      query,
      domain,
      limit,
      offset,
    });

    return NextResponse.json({
      provider: provider.name,
      total: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Patent search failed' },
      { status: 500 }
    );
  }
}
