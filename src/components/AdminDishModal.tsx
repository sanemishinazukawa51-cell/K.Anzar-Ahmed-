import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { MenuCategory, MenuItem } from '../types/canteen';

const CATEGORIES: MenuCategory[] = [
  'Bowls & Meals',
  'Wraps & Sandwiches',
  'Snacks & Sides',
  'Drinks & Coffee',
];

const DISH_THUMBNAIL_PRESETS = [
  {
    name: 'Teriyaki Chicken Grain Bowl',
    imageUrl: '/src/assets/images/teriyaki_chicken_bowl_1795060285565.jpg',
  },
  {
    name: 'Mediterranean Falafel & Quinoa Bowl',
    imageUrl: '/src/assets/images/falafel_quinoa_bowl_1795060285347.jpg',
  },
  {
    name: 'Spicy Sesame Tofu Noodle Bowl',
    imageUrl: '/src/assets/images/spicy_tofu_udon_1795060286156.jpg',
  },
  {
    name: 'Crispy Paneer Pesto Panini',
    imageUrl: '/src/assets/images/paneer_pesto_panini_1795060286390.jpg',
  },
  {
    name: 'Smoky Chipotle Chicken Wrap',
    imageUrl: '/src/assets/images/chipotle_chicken_wrap_1795060285094.jpg',
  },
  {
    name: 'Herb Avocado & Egg Brioche',
    imageUrl: '/src/assets/images/avocado_egg_brioche_1795060286448.jpg',
  },
  {
    name: 'Crispy Herb & Parmesan Fries',
    imageUrl: '/src/assets/images/herb_parmesan_fries_1795060285664.jpg',
  },
  {
    name: 'Crispy Samosa Chaat Box',
    imageUrl: '/src/assets/images/samosa_chaat_box_1795060285359.jpg',
  },
  {
    name: 'Berry Granola Yogurt Cup',
    imageUrl: '/src/assets/images/berry_yogurt_parfait_1795060285126.jpg',
  },
  {
    name: 'Iced Caramel Cold Brew',
    imageUrl: '/src/assets/images/iced_caramel_coldbrew_1795060285039.jpg',
  },
  {
    name: 'Iced Ceremonial Matcha Latte',
    imageUrl: '/src/assets/images/iced_matcha_latte_1795060285169.jpg',
  },
  {
    name: 'Fresh Mango Mint Cooler',
    imageUrl: '/src/assets/images/mango_mint_cooler_1795060285154.jpg',
  },
];

interface AdminDishModalProps {
  open: boolean;
  editingItem: MenuItem | null;
  onClose: () => void;
  onSave: (item: MenuItem | Omit<MenuItem, 'id'>, isEdit: boolean) => void;
}

export function AdminDishModal({
  open,
  editingItem,
  onClose,
  onSave,
}: AdminDishModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MenuCategory>('Bowls & Meals');
  const [price, setPrice] = useState('150');
  const [calories, setCalories] = useState('480');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('6');
  const [workloadPoints, setWorkloadPoints] = useState('6');
  const [stock, setStock] = useState('15');
  const [isVeg, setIsVeg] = useState(true);
  const [imageUrl, setImageUrl] = useState(DISH_THUMBNAIL_PRESETS[0].imageUrl);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description);
      setCategory(editingItem.category);
      setPrice(String(Math.round(editingItem.price)));
      setCalories(String(editingItem.calories));
      setPrepTimeMinutes(String(editingItem.prepTimeMinutes));
      setWorkloadPoints(String(editingItem.workloadPoints));
      setStock(String(editingItem.stock));
      setIsVeg(editingItem.isVeg);
      setImageUrl(editingItem.imageUrl);
    } else {
      setName('');
      setDescription('');
      setCategory('Bowls & Meals');
      setPrice('150');
      setCalories('480');
      setPrepTimeMinutes('6');
      setWorkloadPoints('6');
      setStock('15');
      setIsVeg(true);
      setImageUrl(DISH_THUMBNAIL_PRESETS[0].imageUrl);
    }
  }, [editingItem, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedStock = Math.max(0, parseInt(stock, 10) || 0);
    const payload = {
      name: name.trim() || 'Campus Special',
      description:
        description.trim() || 'Freshly prepared to order at the campus kitchen.',
      category,
      price: Math.max(10, Math.round(parseFloat(price) || 100)),
      calories: Math.max(50, parseInt(calories, 10) || 350),
      prepTimeMinutes: Math.max(1, parseInt(prepTimeMinutes, 10) || 5),
      workloadPoints: Math.max(1, parseInt(workloadPoints, 10) || 4),
      stock: parsedStock,
      isVeg,
      isAvailable: parsedStock > 0,
      popular: editingItem?.popular ?? false,
      imageUrl,
    };

    if (editingItem) {
      onSave({ ...editingItem, ...payload }, true);
    } else {
      onSave(payload, false);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#091812]/55 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#DCE5DF] bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5ECE8] pb-3">
          <h2
            id="dish-modal-title"
            className="text-lg font-bold text-[#0F1E18] font-display"
          >
            {editingItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F8F7] text-[#3C4F45] hover:bg-[#EAF1ED]"
            aria-label="Close dish modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#3C4F45]">
              Dish Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Crispy Herb Paneer Wrap"
              className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3.5 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3C4F45]">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredients and preparation style"
              className="mt-1 w-full rounded-xl border border-[#D4DFD8] bg-white p-3 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MenuCategory)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Price (₹)
              </label>
              <input
                type="number"
                step="5"
                min="10"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Prep (min)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm text-[#0F1E18]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Workload Pts
              </label>
              <input
                type="number"
                min="1"
                max="25"
                required
                value={workloadPoints}
                onChange={(e) => setWorkloadPoints(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm text-[#0F1E18]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Stock Qty
              </label>
              <input
                type="number"
                min="0"
                max="500"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm text-[#0F1E18]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Calories
              </label>
              <input
                type="number"
                min="50"
                max="2000"
                required
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm text-[#0F1E18]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#E2E8E4] bg-[#F6F8F7] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#0F1E18]">
                Vegetarian Dish
              </p>
              <p className="text-xs text-[#5A6D63]">
                Included when students toggle Veg Only
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isVeg}
              onClick={() => setIsVeg((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                isVeg ? 'bg-[#10B981]' : 'bg-[#CBD5CF]'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  isVeg ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!editingItem && (
            <div>
              <label className="block text-xs font-semibold text-[#3C4F45]">
                Thumbnail Preset
              </label>
              <select
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 text-xs text-[#0F1E18]"
              >
                {DISH_THUMBNAIL_PRESETS.map((preset) => (
                  <option key={preset.imageUrl} value={preset.imageUrl}>
                    Photo: {preset.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-[#D4DFD8] bg-white px-4 py-2 text-xs font-semibold text-[#3C4F45] hover:bg-[#F6F8F7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#09533A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0F6B4B]"
            >
              {editingItem ? 'Save Changes' : 'Add Dish to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
