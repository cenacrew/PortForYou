/**
 * Convention de commit — Conventional Commits.
 * Format : type(scope?): sujet   (ex. `feat(api): auth maison JWT + refresh`)
 * Vérifié localement par le hook Husky `commit-msg`.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nouvelle fonctionnalité
        'fix', // correction de bug
        'refactor', // refonte sans changement de comportement
        'perf', // performance
        'docs', // documentation
        'style', // formatage, sans impact code
        'test', // tests
        'build', // build, dépendances
        'ci', // CI/CD
        'chore', // maintenance
        'revert', // annulation d'un commit
      ],
    ],
    // Scopes conseillés (non bloquant) : api, web, atelier, monolith, papier,
    // shared, infra, auth, billing, provisioning, deps
    'scope-enum': [
      1,
      'always',
      [
        'api',
        'web',
        'atelier',
        'monolith',
        'papier',
        'shared',
        'infra',
        'auth',
        'billing',
        'provisioning',
        'templates',
        'deps',
        'ci',
        'release',
      ],
    ],
    'subject-case': [0], // français : on n'impose pas la casse
    'header-max-length': [2, 'always', 100],
  },
};
