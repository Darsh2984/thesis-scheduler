import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

/* ============================
   GET /api/upload-rooms
   ============================ */
export async function GET() {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json({
      count: rooms.length,
      rows: rooms.map(r => ({ id: r.id, name: r.name })),
    });
  } catch (err) {
    console.error('❌ Failed to fetch rooms:', err);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

/* ============================
   POST /api/upload-rooms
   - JSON manual add: { name }
   - Excel/CSV: multipart/form-data with field "file"
   ============================ */
export async function POST(req) {
  try {
    const ct = req.headers.get('content-type') || '';

    // Manual JSON add
    if (ct.includes('application/json')) {
      const body = await req.json();
      const name = (body?.name || '').toString().trim();
      if (!name) {
        return NextResponse.json({ error: 'Room name required' }, { status: 400 });
      }
      const created = await prisma.room.create({ data: { name } });
      return NextResponse.json({ message: 'Room created', room: created }, { status: 201 });
    }

    // Excel/CSV upload
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let wb;
      try {
        wb = XLSX.read(buffer, { type: 'buffer' });
      } catch (e) {
        console.error('❌ XLSX read error:', e);
        return NextResponse.json({ error: 'Failed to parse Excel/CSV file' }, { status: 400 });
      }

      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        return NextResponse.json({ error: 'Workbook has no sheets' }, { status: 400 });
      }

      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Accept a variety of headers for "name"
      const nameKeys = ['Name', 'Room', 'Room Name', 'room_name', 'room', 'Room Number', 'number'];

      const names = new Set();
      for (const r of rows) {
        let value = '';
        for (const k of Object.keys(r)) {
          if (nameKeys.some(nk => nk.toLowerCase() === k.toLowerCase())) {
            value = String(r[k] ?? '').trim();
            if (value) break;
          }
        }
        if (value) names.add(value);
      }

      const uniqueNames = Array.from(names);
      if (uniqueNames.length === 0) {
        return NextResponse.json({ error: 'No valid rows found in the file' }, { status: 400 });
      }

      // Try a bulk insert first (works best if you have UNIQUE index on Room.name)
      try {
        const result = await prisma.room.createMany({
          data: uniqueNames.map(name => ({ name })),
          skipDuplicates: true,
        });
        const added = result?.count ?? 0;
        if (added === 0) {
          return NextResponse.json({ error: 'No new rooms were added (all duplicates or invalid)' }, { status: 400 });
        }
        return NextResponse.json({ message: `Uploaded ${added} room(s)`, added }, { status: 201 });
      } catch (bulkErr) {
        // Fallback: sequential (in case createMany isn’t supported)
        console.warn('createMany failed, falling back to sequential:', bulkErr?.message);
        let added = 0;
        for (const name of uniqueNames) {
          try {
            await prisma.room.create({ data: { name } });
            added += 1;
          } catch {
            // likely duplicate; skip
          }
        }
        if (added === 0) {
          return NextResponse.json({ error: 'No new rooms were added (all duplicates or invalid)' }, { status: 400 });
        }
        return NextResponse.json({ message: `Uploaded ${added} room(s)`, added }, { status: 201 });
      }
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  } catch (err) {
    console.error('❌ Error in POST /upload-rooms:', err);
    return NextResponse.json({ error: err?.message || 'Failed to process request' }, { status: 500 });
  }
}

/* ============================
   DELETE /api/upload-rooms
   - Single:   /api/upload-rooms?id=123
   - Delete all: /api/upload-rooms (no id)
   ============================ */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      await prisma.room.delete({ where: { id } });
      return NextResponse.json({ message: 'Room deleted' }, { status: 200 });
    }

    // delete all
    const result = await prisma.room.deleteMany({});
    return NextResponse.json({ message: `Deleted ${result.count} room(s)` }, { status: 200 });
  } catch (err) {
    console.error('❌ Error deleting room(s):', err);
    return NextResponse.json({ error: 'Failed to delete room(s)' }, { status: 500 });
  }
}
