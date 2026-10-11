import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";

type Props = {
  placeholder: string;
  hasControls?: boolean;
};

export function ListSearchSkeleton({
  placeholder,
  hasControls = false,
}: Props) {
  return (
    <div className={cx(hasControls ? listSearch.rowWithSort : listSearch.row)}>
      <input
        type="search"
        className={listSearch.input}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        disabled
      />
    </div>
  );
}
