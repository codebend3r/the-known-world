import listSearch from "@/components/listSearch.module.scss";

type Props = {
  /** Plural noun for the message, e.g. `"dragons"`. */
  noun: string;
  query: string;
};

export function ListSearchEmpty({ noun, query }: Props) {
  return (
    <p className={listSearch.empty}>
      No {noun} match &ldquo;{query}&rdquo;.
    </p>
  );
}
