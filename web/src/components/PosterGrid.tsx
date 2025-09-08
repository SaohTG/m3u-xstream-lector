type Item = { externalId: string, title: string, posterUrl?: string }
export default function PosterGrid({items,onClick}:{items:Item[], onClick:(it:Item)=>void}){
  return (
    <div className="grid-posters">
      {items.map(it=>(
        <button key={it.externalId} className="card text-left" onClick={()=>onClick(it)}>
          <img src={it.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'} alt={it.title} className="w-full aspect-[2/3] object-cover" />
          <div className="p-2 text-sm">{it.title}</div>
        </button>
      ))}
    </div>
  )
}
