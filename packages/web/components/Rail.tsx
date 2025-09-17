import CardItem from './CardItem';

export default function Rail({ title, items }: { title: string; items: { id: string; title: string; poster?: string }[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((it)=> <CardItem key={it.id} title={it.title} poster={it.poster} />)}
      </div>
    </section>
  );
}
