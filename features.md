# Fonctionnalités et règles métier – Affectation salariés/chantiers

## Règles d'affectation

- **Heures max/semaine** : Un salarié ne peut pas être affecté à plus de 35h par semaine.
- **Heures max/jour** : Un salarié ne peut pas être affecté à plus de 9h par jour (tous chantiers confondus).
- **Répartition équitable** : Si plusieurs salariés sont affectés à un même chantier, les heures sont réparties équitablement entre eux.
- **Affectation manuelle** : L'affectation des salariés aux chantiers se fait manuellement (pas d'affectation automatique dans la seed).
- **Compétences** : Les salariés et chantiers ont des compétences associées (ex : nettoyage_sols, vitres, moquette, bureaux).

## Seed de test

- **Salariés** : 5 salariés avec prénoms/noms et adresses réalistes à Marseille.
- **Chantiers** : 16 chantiers avec noms/adresses réalistes à Marseille, heures variées (4h à 22h/semaine).
- **Aucune affectation automatique** : Les champs `equipe_affectee` et `affectations` sont vides après seed.

## Gestion d'état (frontend)

- Utilisation possible de React Context (`useContext`) pour partager la liste des chantiers non affectés entre plusieurs composants.
- Pas besoin de bibliothèque d'état globale (Redux, Zustand, etc.) sauf si l'app devient très complexe.
- SWR/React Query recommandés pour la gestion du cache et des requêtes API.

## Améliorations/roadmap

- Ajouter un contrôle d'affectation pour respecter la limite de 9h/jour par salarié.
- Ajouter des notifications ou badges pour les chantiers/salariés non affectés.
- Moderniser le dashboard (cartes pastel, avatars, badges, barres de progression, etc.).
- Générer des seeds réalistes pour d'autres villes (Paris, Lyon, etc.).
- Ajouter des tests automatisés sur la logique d'affectation.

## Affectation partielle (NOUVEAU - à implémenter)

**Description :**
Permet d’affecter les salariés sur les jours où ils sont disponibles, même si certains jours du chantier restent non pourvus. Les jours non couverts sont signalés dans l’interface.

**Fonctionnement :**
- L’algorithme tente d’affecter chaque jour du chantier à un salarié disponible, en respectant toutes les contraintes (7h/jour, 35h/semaine, compétences, etc.).
- Si un ou plusieurs jours ne peuvent pas être pourvus, ils sont listés comme « jours non pourvus ».
- Le chantier est partiellement affecté : les jours couverts sont attribués, les jours non couverts sont signalés (ex : en rouge dans l’UI).
- Un champ `jours_non_pourvus` (array de string) peut être ajouté au modèle `Chantier` pour stocker ces jours, ou l’info peut être affichée dans la note.

**À faire :**
- [ ] Backend : modifier l’algorithme d’affectation pour permettre l’affectation partielle et enregistrer les jours non pourvus.
- [ ] Backend : ajouter le champ `jours_non_pourvus` dans le modèle `Chantier` (optionnel).
- [ ] Frontend : afficher les jours non pourvus dans la liste des chantiers et dans les détails.
- [ ] (Option) Ajouter un paramètre pour activer/désactiver l’affectation partielle.
- [ ] **Suggestion :** Ajouter des tests de performance et de cas limites (ex : 100 chantiers, 1000 salariés) pour valider la robustesse et la rapidité de l’algorithme.

**Exemple :**
> Chantier : École Saint-Charles
> Jours non pourvus : vendredi
> (Les autres jours sont affectés normalement)

---

*Document de référence pour le projet d'affectation – à compléter au fil des évolutions.* 