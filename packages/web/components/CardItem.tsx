export default function CardItem({ title, poster }: { title: string; poster?: string }) {
  return (
    <div className="w-40">
      <div className="aspect-[2/3] rounded-lg bg-zinc-800 overflow-hidden">
        {poster ? <img src={poster} alt={title} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="mt-2 text-sm line-clamp-2">{title}</div>
    </div>
  );
}
