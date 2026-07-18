import type { z } from 'zod';

interface ParseIssue {
  path: PropertyKey[];
  message: string;
}

/**
 * Erreur levée quand un document Firestore ne respecte pas le schéma attendu :
 * corruption, migration incomplète, écriture par un ancien code. Transforme un
 * `snap.data() as X` mensonger en échec explicite et localisé (collection + id).
 */
export class DocumentCorruptedError extends Error {
  constructor(
    public readonly collection: string,
    public readonly docId: string,
    public readonly issues: ParseIssue[],
  ) {
    const summary = issues
      .map((i) => `${i.path.map(String).join('.') || '(racine)'}: ${i.message}`)
      .join(' ; ');
    super(`Document ${collection}/${docId} corrompu — ${summary}`);
    this.name = 'DocumentCorruptedError';
  }
}

interface DocSnapshot {
  id: string;
  exists?: boolean;
  data(): unknown;
}

/**
 * Valide les données d'un document via un schéma zod aux frontières de lecture.
 * Retourne les données typées (et fiables) ; lève `DocumentCorruptedError` si le
 * document ne correspond pas au schéma.
 *
 * Les schémas de `packages/shared` (`storedSiteSchema`, `storedOrderSchema`…)
 * sont volontairement « loose » : les champs annexes et les `Timestamp`
 * Firestore traversent tels quels, seuls les champs critiques sont contrôlés.
 */
export function parseDoc<S extends z.ZodType>(
  schema: S,
  snap: DocSnapshot,
  collection: string,
): z.infer<S> {
  const data = snap.data();
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new DocumentCorruptedError(collection, snap.id, result.error.issues);
  }
  return result.data as z.infer<S>;
}
