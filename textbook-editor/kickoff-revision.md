# Textbook Revision - Kickoff Prompt

## Goal

Revise all textbook pages that have corresponding errata files. Apply corrections from the errata to produce updated pages that match the actual codebase.

**Golden Rule:** The source code is always correct. Any conflict between the textbook and the codebase means the textbook is wrong and must be corrected.

## Input

### Original Textbook Pages
Directory: `~/projects/vvroom/textbook-pages/`
- Contains 445 markdown files (`.md`)
- Files are numbered with 3-digit prefixes (e.g., `000-`, `051-`, `101-`)
- Each file describes implementation of a specific component/service/concept

### Errata Files
Directory: `~/projects/vvroom/textbook-errata/`
- Contains errata files using naming convention: `{prefix}-errata.md`
- Each errata file documents discrepancies between textbook and codebase
- Only prefixes with issues have errata files

### Application Codebase (Source of Truth)
Directory: `~/projects/vvroom/src/`
- Angular application with the actual implemented code
- Services in `src/app/framework/services/`
- Components in `src/app/framework/components/`
- Domain config in `src/app/domain-config/`
- Models in `src/app/framework/models/`

## Output

Destination directory: `~/projects/vvroom/textbook-revised/`
- Revised files maintain original naming: `{prefix}-p{N}.md`
- Only pages with corrections get revised versions
- Pages without errata are copied as-is (or skipped if unchanged)

## Revision Rules

### 1. Code Corrections
When errata identifies a code mismatch:
- Replace the incorrect code block with the actual code from the codebase
- Ensure imports, exports, and method signatures match exactly
- Preserve the surrounding explanatory text where still accurate

### 2. Path Corrections
When errata identifies incorrect file paths:
- Update paths to reflect actual file locations
- Update any import statements that reference incorrect paths

### 3. API Corrections
When errata identifies API discrepancies:
- Update endpoint URLs to match actual API
- Update request/response schemas to match actual types
- Update parameter names to match actual implementation

### 4. Cross-Reference Corrections
When errata identifies broken cross-references:
- Update page references to point to correct pages
- Update section references to match actual section names
- Ensure terminology is consistent

### 5. Preserve Teaching Intent
While correcting factual errors:
- Maintain the pedagogical flow and explanations
- Keep simplifications that are clearly marked as such
- Preserve examples that illustrate concepts (update code, keep explanation)

## Revision Process

For each errata file:
1. Read the errata file to understand all issues
2. For each page referenced in the errata:
   a. Read the original textbook page
   b. Read the actual source code (if needed for context)
   c. Apply each correction from the errata
   d. Write the revised page to `textbook-revised/`
3. Verify the revision addresses all listed issues

## Revised File Format

Revised files should:
- Maintain the same overall structure as the original
- Include a revision header (optional, at discretion):
```markdown
<!-- Revised: 2026-02-14 - Applied errata corrections -->
```
- Contain corrected code blocks matching actual implementation
- Have accurate file paths and references

## Processing Order

Process errata files in numerical order by their prefix:

### Foundation (000-299)
1. `000-errata.md` → revise `000-p*.md`
2. `051-errata.md` → revise `051-p*.md`
3. etc.

### Services (300-399)
4. `301-errata.md` → revise `301-p*.md`
5. etc.

### Models & Adapters (400-599)
6. `401-errata.md` → revise `401-p*.md`
7. etc.

### Domain Config & Components (600-899)
8. `601-errata.md` → revise `601-p*.md`
9. etc.

### Pages & Integration (900+)
10. `901-errata.md` → revise `901-p*.md`
11. `A01-errata.md` → revise `A01-p*.md`
12. etc.

## Workflow

1. Create output directory `textbook-revised/` if it doesn't exist
2. List all errata files in `textbook-errata/`
3. For each errata file:
   a. Parse the errata to extract all issues
   b. Identify which pages need revision (from `{prefix}-p*.md`)
   c. For each affected page:
      - Read original page
      - Apply corrections based on errata issues
      - Write revised page to output directory
   d. Report: `{prefix}: {N} pages revised`
4. Copy unchanged pages (those without errata) to output directory
5. Generate summary report:
   - Total pages processed
   - Pages revised
   - Pages unchanged
   - Issues resolved by type
6. Commit revised files and push to github, gitlab

## Success Criteria

- All pages with errata have been revised
- Revised code blocks match actual codebase implementation
- File paths and references are accurate
- Teaching content and explanations preserved
- No new errors introduced
- Summary report generated

## Notes

### Handling Ambiguous Corrections
If an errata issue is unclear:
- Consult the actual source code directly
- Prioritize code accuracy over textbook wording
- When in doubt, include more context from actual code

### Preserving Style
When revising:
- Match the writing style of the original textbook
- Keep consistent formatting (headings, code fence style, etc.)
- Maintain the same level of detail in explanations

### Complex Refactors
If the codebase has significantly changed:
- Focus on making code examples accurate
- Update explanations to reflect new architecture
- Note when a concept has evolved substantially
