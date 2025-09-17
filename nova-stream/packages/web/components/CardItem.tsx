import Link from 'next/link';
import Image from 'next/image';
import { Movie, Series } from '@novastream/shared';
import { Card, CardContent } from '@/components/ui/card';

interface CardItemProps {
  item: Movie | Series;
  type: 'movie' | 'series';
}

export function CardItem({ item, type }: CardItemProps) {
  const href = type === 'movie' ? `/movies/${item.id}` : `/series/${item.id}`;
  const logo = item.logo || (item as Series).cover;

  return (
    <Link href={href} className="block group">
      <Card className="overflow-hidden transition-all duration-200 ease-in-out group-hover:scale-105 group-hover:shadow-lg">
        <CardContent className="p-0">
          <div className="aspect-[2/3] relative">
            {logo ? (
              <Image
                src={logo}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground text-xs text-center p-2">{item.title}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="mt-2 text-sm font-medium truncate group-hover:text-primary">{item.title}</p>
    </Link>
  );
}
