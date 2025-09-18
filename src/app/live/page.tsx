export default function LivePage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">TV en direct</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="skel h-40" />
        <div className="skel h-40" />
        <div className="skel h-40" />
        <div className="skel h-40" />
        <div className="skel h-40" />
      </div>
    </div>
  );
}
