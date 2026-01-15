interface CategoryButtonsProps {
  categories: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryButtons({
  categories,
  selectedId,
  onSelectCategory,
}: CategoryButtonsProps) {
  return (
    <div className="px-6 py-4 bg-[#f8fafc] dark:bg-background-dark/95 backdrop-blur z-10 sticky top-0">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        <button
          onClick={() => onSelectCategory('')}
          className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-6 transition-transform active:scale-95 ${
            selectedId === ''
              ? 'bg-[#3c83f6] text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <p className="text-sm font-bold leading-normal">ALL</p>
        </button>

        {categories.map((category, idx) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-6 transition-colors ${
              selectedId === category.id
                ? 'bg-[#3c83f6] text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {/* simple icon choices by index to mimic provided design */}
            <span className="material-symbols-outlined text-xl">
              {idx % 5 === 0 ? 'coffee' : idx % 5 === 1 ? 'local_drink' : idx % 5 === 2 ? 'cake' : idx % 5 === 3 ? 'cookie' : 'fastfood'}
            </span>
            <p className="text-sm font-medium leading-normal">{category.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
