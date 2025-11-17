import { NextResponse } from "next/server";


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { message: "URL is required" },
                { status: 400 }
            );
        }

        const res = await fetch(`http://127.0.0.1:8000/ingest/url`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            return NextResponse.json(
                { message: errorData.detail },
                { status: 400 }
            );
        }
        const data = await res.json();
        return NextResponse.json({
            message: data.message,
            url_id: data.url_id,
            job_id: data.job_id,
            status: data.status,

        }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Error ingesting data", error: (error as Error).message },
            { status: 500 }
        );
    }
}

