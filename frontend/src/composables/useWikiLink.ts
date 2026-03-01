import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

const WIKI_BASE_URL = "https://wiki.walkscape.app/wiki/";
const WIKI_WINDOW_TARGET = "_blank";
const WIKI_WINDOW_FEATURES = "noopener,noreferrer";

const formatWikiName = (name: string): string => name.replaceAll(" ", "_");

export function useWikiLink(name: MaybeRefOrGetter<string>): {
  wikiUrl: ComputedRef<string>;
  openWiki: () => void;
} {
  const wikiUrl = computed<string>(() => `${WIKI_BASE_URL}${formatWikiName(toValue(name))}`);

  const openWiki = (): void => {
    window.open(wikiUrl.value, WIKI_WINDOW_TARGET, WIKI_WINDOW_FEATURES);
  };

  return {
    wikiUrl,
    openWiki,
  };
}
