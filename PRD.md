# Product Requirements Document: Atmos VS Code Extension

**Version:** 1.0  
**Last Updated:** 2025-09-30  
**Author:** Ben Smith  
**Status:** Draft

---

## Executive Summary

The Atmos VS Code Extension is a developer productivity tool designed to enhance the experience of working with Cloud Posse's Atmos framework. This extension provides intelligent code assistance, navigation, visualization, and orchestration capabilities for managing complex infrastructure-as-code projects using Atmos stacks and components.

---

## 1. Product Overview

### 1.1 Problem Statement

Developers and DevOps engineers working with Atmos face several challenges:

- **Complex Stack Hierarchies**: Understanding deeply nested stack configurations with multiple inheritance layers is difficult without visual aids
- **Navigation Overhead**: Jumping between stack definitions, component configurations, and Terraform modules requires manual file searching
- **Configuration Validation**: Identifying configuration errors before running `atmos` commands wastes time
- **Limited Discoverability**: Understanding available components, stacks, and their relationships requires extensive documentation reading
- **Context Switching**: Moving between the IDE and terminal to run Atmos commands disrupts workflow

### 1.2 Product Vision

Create a seamless, integrated development environment for Atmos that makes working with infrastructure-as-code as intuitive as modern application development, reducing cognitive load and accelerating delivery.

### 1.3 Target Users

- **Primary**: DevOps Engineers and Platform Engineers managing Atmos-based infrastructure
- **Secondary**: Infrastructure Developers writing Terraform components
- **Tertiary**: SREs and Operations teams deploying and troubleshooting infrastructure

### 1.4 Success Metrics

- Reduce time to navigate stack configurations by 60%
- Decrease configuration errors caught during `atmos` execution by 40%
- Achieve 80% adoption rate among Atmos users within 6 months
- Maintain 4+ star rating on VS Code marketplace

---

## 2. Core Features

### 2.1 Syntax Highlighting & Language Support

**Priority:** P0 (Must Have)

#### Description
Provide rich syntax highlighting and language support for Atmos-specific YAML files.

#### Requirements
- **F-001**: Syntax highlighting for Atmos stack YAML files (location configured in `atmos.yaml`)
- **F-002**: Distinguish between different YAML sections (imports, vars, components, settings)
- **F-003**: Highlight Atmos-specific functions and template expressions
- **F-004**: Color-code component references and stack inheritance
- **F-005**: Support for `atmos.yaml` configuration file syntax

#### Acceptance Criteria
- Stack YAML files display with appropriate syntax coloring
- Atmos functions (e.g., template expressions) are visually distinct
- Configuration matches or exceeds quality of generic YAML highlighting

---

### 2.2 IntelliSense & Auto-completion

**Priority:** P0 (Must Have)

#### Description
Intelligent code completion for Atmos configurations based on schema and project context.

#### Requirements
- **F-006**: Auto-complete component names from `components/terraform/` directory
- **F-007**: Suggest available stack names when referencing imports
- **F-008**: Provide variable name completion based on component schemas
- **F-009**: Auto-complete Atmos CLI configuration keys in `atmos.yaml`
- **F-010**: Context-aware suggestions for stack metadata (namespace, tenant, environment, stage)
- **F-011**: Snippet support for common Atmos patterns (component definition, stack import, etc.)

#### Acceptance Criteria
- Typing component names triggers auto-complete with available components
- Import paths suggest valid stack files
- Variable completion reflects actual component inputs
- Snippets reduce boilerplate by 70%

---

### 2.3 Stack Navigation & Go-to-Definition

**Priority:** P0 (Must Have)

#### Description
Enable quick navigation between related stack files, components, and configurations.

#### Requirements
- **F-012**: "Go to Definition" for component references → Terraform module
- **F-013**: "Go to Definition" for stack imports → imported stack file
- **F-014**: "Find All References" for components across all stacks
- **F-015**: Breadcrumb navigation showing stack inheritance chain
- **F-016**: Quick navigation to `atmos.yaml` from any stack file

#### Acceptance Criteria
- Cmd/Ctrl+Click on component name opens Terraform module
- Cmd/Ctrl+Click on import path opens referenced stack
- "Find All References" shows all stacks using a component
- Breadcrumbs display full inheritance path

---

### 2.4 Stack Visualization

**Priority:** P1 (Should Have)

#### Description
Visual representation of stack hierarchies, component relationships, and configuration inheritance.

#### Requirements
- **F-017**: Tree view showing all stacks organized by namespace/tenant/environment/stage
- **F-018**: Dependency graph visualizing stack imports and inheritance
- **F-019**: Component usage matrix showing which stacks use which components
- **F-020**: Interactive graph allowing click-to-navigate to stack/component
- **F-021**: Visual diff showing configuration changes between stack layers

#### Acceptance Criteria
- Tree view displays complete stack hierarchy
- Graph accurately represents import relationships
- Clicking nodes navigates to corresponding files
- Diff view highlights overridden values

---

### 2.5 Configuration Validation & Linting

**Priority:** P1 (Should Have)

#### Description
Real-time validation of Atmos configurations with actionable error messages.

#### Requirements
- **F-022**: Validate stack YAML syntax and structure
- **F-023**: Check for missing required component variables
- **F-024**: Warn about undefined component references
- **F-025**: Detect circular import dependencies
- **F-026**: Validate `atmos.yaml` schema compliance
- **F-027**: Configurable linting rules for organizational standards
- **F-028**: Quick fixes for common issues (e.g., add missing import)

#### Acceptance Criteria
- Syntax errors appear in Problems panel immediately
- Missing variables show inline warnings
- Circular dependencies are detected and reported
- Quick fixes resolve 80% of common errors

---

### 2.6 Stack Rendering & Preview

**Priority:** P1 (Should Have)

#### Description
Show the final, deep-merged configuration for any stack without running CLI commands.

#### Requirements
- **F-029**: "Render Stack" command to display fully merged configuration
- **F-030**: Side-by-side view comparing raw vs. rendered configuration
- **F-031**: Highlight which file/layer each value originates from
- **F-032**: Export rendered configuration as JSON/YAML
- **F-033**: Filter rendered output by component or section

#### Acceptance Criteria
- Rendered output matches `atmos describe component` output
- Source attribution shows inheritance chain for each value
- Export generates valid JSON/YAML files
- Filtering reduces noise for large configurations

---

### 2.7 Integrated Terminal Commands

**Priority:** P2 (Nice to Have)

#### Description
Execute Atmos CLI commands directly from the editor with context awareness.

#### Requirements
- **F-034**: Command palette integration for common Atmos commands
- **F-035**: Right-click context menu on stack files to run commands
- **F-036**: "Plan" and "Apply" buttons in stack editor toolbar
- **F-037**: Terminal output parsing with clickable file paths
- **F-038**: Command history and favorites
- **F-039**: Pre-flight checks before destructive operations

#### Acceptance Criteria
- Commands run in integrated terminal
- Context menu shows relevant commands for current file
- Terraform plan output includes clickable paths
- Confirmation prompts prevent accidental applies

---

### 2.8 Component Scaffolding

**Priority:** P2 (Nice to Have)

#### Description
Generate boilerplate for new components and stacks following best practices.

#### Requirements
- **F-040**: "New Component" wizard for creating Terraform components
- **F-041**: "New Stack" wizard with template selection
- **F-042**: Customizable templates for organizational standards
- **F-043**: Auto-generate component schema from Terraform variables
- **F-044**: Validate generated files against linting rules

#### Acceptance Criteria
- Wizard creates valid component structure
- Generated stacks follow naming conventions
- Templates are customizable via settings
- Schema generation matches Terraform inputs

---

### 2.9 Workspace Management

**Priority:** P2 (Nice to Have)

#### Description
Manage multiple Atmos projects and configurations within a single workspace.

#### Requirements
- **F-045**: Auto-detect Atmos projects by `atmos.yaml` presence
- **F-046**: Support for monorepo with multiple Atmos roots
- **F-047**: Workspace-level settings for Atmos CLI path and options
- **F-048**: Project switcher for multi-project workspaces

#### Acceptance Criteria
- Extension activates when `atmos.yaml` is detected
- Multiple projects are isolated and independently managed
- Settings override hierarchy: workspace > user > default

---

### 2.10 Documentation & Help

**Priority:** P2 (Nice to Have)

#### Description
Contextual documentation and learning resources within the editor.

#### Requirements
- **F-049**: Hover tooltips showing component/variable documentation
- **F-050**: Inline documentation from Terraform module descriptions
- **F-051**: Quick links to Atmos documentation for configuration keys
- **F-052**: Example snippets with explanations
- **F-053**: Onboarding walkthrough for new users

#### Acceptance Criteria
- Hovering over component shows description
- Documentation links open relevant Atmos docs
- Walkthrough completes in under 5 minutes

---

## 3. Technical Architecture

### 3.1 Technology Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Parser**: YAML parser with Atmos schema awareness
- **Visualization**: D3.js or similar for graphs
- **Testing**: Mocha, VS Code Extension Test Runner

### 3.2 Key Components

1. **Language Server**: Provides IntelliSense, validation, and navigation
2. **File System Watcher**: Monitors changes to stack and component files
3. **Configuration Parser**: Deep-merges stack configurations following Atmos rules
4. **CLI Integration**: Executes and parses Atmos CLI output
5. **UI Components**: Tree views, webviews for visualization

### 3.3 Performance Requirements

- **P-001**: Extension activation time < 500ms
- **P-002**: IntelliSense suggestions appear within 100ms
- **P-003**: Stack rendering completes within 2 seconds for typical projects
- **P-004**: Support projects with 500+ stack files without degradation

### 3.4 Dependencies

- Atmos CLI (optional but recommended for full functionality)
- VS Code 1.101.0 or higher
- Node.js runtime (bundled with VS Code)

---

## 4. User Experience

### 4.1 Installation & Setup

1. Install from VS Code Marketplace
2. Open workspace containing `atmos.yaml`
3. Extension auto-activates and indexes project
4. Optional: Configure Atmos CLI path in settings

### 4.2 Primary User Flows

#### Flow 1: Navigate Stack Configuration
1. Open stack YAML file
2. Cmd/Ctrl+Click on component name
3. View Terraform module definition
4. Use breadcrumbs to navigate back

#### Flow 2: Validate Configuration
1. Edit stack file
2. See real-time validation errors
3. Click quick fix suggestion
4. Error resolves automatically

#### Flow 3: Render Stack
1. Right-click stack file
2. Select "Render Stack Configuration"
3. View merged output in side panel
4. Export or copy rendered config

#### Flow 4: Execute Terraform Plan
1. Open stack file
2. Click "Plan" button in toolbar
3. Review plan output in terminal
4. Click file paths to jump to resources

---

## 5. Configuration & Settings

### 5.1 Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `atmos.cliPath` | string | `"atmos"` | Path to Atmos CLI executable |
| `atmos.configPath` | string | `"atmos.yaml"` | Relative path to Atmos config |
| `atmos.stacksPath` | string | `"stacks"` | Relative path to stacks directory |
| `atmos.componentsPath` | string | `"components/terraform"` | Relative path to components |
| `atmos.validation.enabled` | boolean | `true` | Enable real-time validation |
| `atmos.validation.onSave` | boolean | `true` | Validate on file save |
| `atmos.rendering.autoRefresh` | boolean | `true` | Auto-refresh rendered views |
| `atmos.terminal.confirmDestructive` | boolean | `true` | Confirm before apply/destroy |

---

## 6. Release Plan

### 6.1 Phase 1: MVP (v0.1.0) - Target: Q1 2026

**Scope:**
- Syntax highlighting (F-001 to F-005)
- Basic IntelliSense (F-006 to F-008)
- Go-to-definition (F-012, F-013)
- Basic validation (F-022 to F-024)

**Success Criteria:**
- Extension published to marketplace
- 50+ active users
- Core navigation works reliably

### 6.2 Phase 2: Enhanced Navigation (v0.2.0) - Target: Q2 2026

**Scope:**
- Complete IntelliSense (F-009 to F-011)
- Full navigation features (F-014 to F-016)
- Stack tree view (F-017)
- Configuration rendering (F-029 to F-033)

**Success Criteria:**
- 200+ active users
- Positive user feedback on navigation
- <5% error rate in rendering

### 6.3 Phase 3: Visualization & Tooling (v0.3.0) - Target: Q3 2026

**Scope:**
- Dependency graphs (F-018 to F-020)
- Visual diff (F-021)
- Advanced validation (F-025 to F-028)
- Terminal integration (F-034 to F-039)

**Success Criteria:**
- 500+ active users
- 4+ star rating
- Community contributions

### 6.4 Phase 4: Advanced Features (v1.0.0) - Target: Q4 2026

**Scope:**
- Component scaffolding (F-040 to F-044)
- Workspace management (F-045 to F-048)
- Documentation integration (F-049 to F-053)

**Success Criteria:**
- 1000+ active users
- Feature parity with major IaC extensions
- Enterprise adoption

---

## 7. Open Questions & Risks

### 7.1 Open Questions

1. **Q1**: Should the extension bundle Atmos CLI or require separate installation?
   - **Recommendation**: Require separate installation initially, consider bundling in v1.0

2. **Q2**: How to handle custom Atmos functions and template expressions?
   - **Recommendation**: Start with core functions, make extensible via settings

3. **Q3**: Should rendering use CLI or implement deep-merge logic in TypeScript?
   - **Recommendation**: Use CLI when available, fallback to TypeScript implementation

### 7.2 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Atmos CLI API changes | High | Medium | Version detection, compatibility layer |
| Performance with large projects | High | Medium | Lazy loading, indexing optimization |
| Complex YAML parsing edge cases | Medium | High | Comprehensive test suite, user feedback |
| Low adoption rate | High | Low | Marketing, documentation, tutorials |

---

## 8. Success Criteria

### 8.1 Launch Criteria (MVP)

- [ ] All P0 features implemented and tested
- [ ] Documentation complete (README, usage guide)
- [ ] Zero critical bugs
- [ ] Performance benchmarks met
- [ ] Published to VS Code Marketplace

### 8.2 Post-Launch Metrics (3 months)

- [ ] 200+ active installations
- [ ] <5% uninstall rate
- [ ] 4+ star average rating
- [ ] <10 open bugs
- [ ] 80% feature usage (core features)

---

## 9. Future Considerations

### 9.1 Potential Future Features

- **Multi-cloud provider awareness**: Detect and highlight cloud-specific configurations
- **Cost estimation**: Integrate with Infracost or similar tools
- **Security scanning**: Integrate with Checkov, tfsec for policy validation
- **Collaboration features**: Shared stack annotations, comments
- **AI-powered suggestions**: Component recommendations based on patterns
- **Remote state visualization**: Show actual deployed infrastructure
- **Drift detection**: Compare rendered config vs. deployed state

### 9.2 Integration Opportunities

- GitHub Copilot for Atmos-aware code generation
- Terraform extension for seamless component editing
- GitLens for stack configuration history
- Remote development for containerized Atmos environments

---

## 10. Appendix

### 10.1 Glossary

- **Atmos**: Cloud Posse's Terraform orchestration framework
- **Stack**: YAML configuration defining infrastructure for a specific environment
- **Component**: Reusable Terraform "root module" managed by Atmos
- **Deep-merge**: Atmos's configuration inheritance mechanism
- **Stack Manifest**: The final, rendered configuration after all imports and merges

### 10.2 References

- [Atmos Documentation](https://atmos.tools/)
- [Atmos GitHub Repository](https://github.com/cloudposse/atmos)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Cloud Posse Reference Architecture](https://docs.cloudposse.com/)

### 10.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-30 | Ben Smith | Initial PRD creation |

---

**Document Status**: Draft - Ready for Review  
**Next Steps**: Review with stakeholders, prioritize features, begin Phase 1 development
