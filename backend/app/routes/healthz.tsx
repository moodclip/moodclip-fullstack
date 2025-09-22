// app/routes/healthz.tsx
export async function loader() {
  return new Response("OK", { status: 200 });
}
