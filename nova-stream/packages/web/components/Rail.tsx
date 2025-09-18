import { Movie, Series } from '@novastream/shared';
import { CardItem } from './CardItem';

interface RailProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series';
}

export function Rail({ title, items, type }: RailProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="my-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <CardItem key={item.id} item={item} type={type} />
        ))}
      </div>
    </section>
  );
}
