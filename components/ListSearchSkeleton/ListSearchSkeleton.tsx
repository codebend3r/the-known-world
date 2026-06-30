import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";

type Props = {
  placeholder: string;
  withControls?: boolean;
};

export function ListSearchSkeleton({
  placeholder,
  withControls = false,
}: Props) {
  return (
    <div className={cx(withControls ? listSearch.rowWithSort : listSearch.row)}>
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
