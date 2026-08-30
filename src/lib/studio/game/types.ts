import { Artifact, ArtifactActor } from "../../artifacts/types";

export type GameType =
  | "2D"
  | "WEB_2D"
  | "INTERACTIVE_STORY"
  | "QUIZ"
  | "SIMULATION"
  | "OTHER";

export type ComponentType =
  | "TRANSFORM"
  | "SPRITE"
  | "TEXT"
  | "AUDIO_SOURCE"
  | "COLLIDER"
  | "INPUT"
  | "STATE"
  | "VARIABLES"
  | "SCRIPT"
  | "UI";

export type VariableType = "BOOLEAN" | "NUMBER" | "STRING";

export interface GameVariable {
  id: string;
  name: string;
  type: VariableType;
  initialValue: boolean | number | string;
  currentValue?: boolean | number | string;
  description?: string;
}

export type TriggerType =
  | "ON_START"
  | "ON_CLICK"
  | "ON_KEY"
  | "ON_ACTION"
  | "ON_COLLISION"
  | "ON_VARIABLE_CHANGED"
  | "ON_SCENE_ENTER"
  | "ON_TIMER";

export interface GameTrigger {
  type: TriggerType;
  entityId?: string;
  key?: string;
  actionName?: string; // Logical action name (e.g. "MOVE_LEFT", "INTERACT")
  targetEntityId?: string;
  variableId?: string;
  timerMs?: number;
}

export type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "CONTAINS";

export interface GameCondition {
  variableId: string;
  operator: ConditionOperator;
  value: boolean | number | string;
}

export type ActionType =
  | "SET_VARIABLE"
  | "ADD_VARIABLE"
  | "MOVE_ENTITY"
  | "SHOW_ENTITY"
  | "HIDE_ENTITY"
  | "PLAY_AUDIO"
  | "CHANGE_SCENE"
  | "SHOW_TEXT"
  | "END_GAME";

export interface GameAction {
  type: ActionType;
  variableId?: string;
  value?: boolean | number | string;
  entityId?: string;
  deltaX?: number;
  deltaY?: number;
  assetId?: string;
  targetSceneId?: string;
  text?: string;
}

export interface GameRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: GameTrigger;
  conditions: GameCondition[];
  actions: GameAction[];
  priority?: number;
}

export interface TransformComponent {
  type: "TRANSFORM";
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  zIndex: number;
}

export interface SpriteComponent {
  type: "SPRITE";
  assetId: string;
  width: number;
  height: number;
  opacity?: number;
  tint?: string;
}

export interface TextComponent {
  type: "TEXT";
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  alignment?: "left" | "center" | "right";
}

export interface AudioSourceComponent {
  type: "AUDIO_SOURCE";
  assetId: string;
  volume: number;
  loop: boolean;
  playOnStart?: boolean;
}

export interface ColliderComponent {
  type: "COLLIDER";
  shape: "RECTANGLE" | "CIRCLE";
  width: number;
  height: number;
  radius?: number;
  isTrigger?: boolean;
}

export interface InputComponent {
  type: "INPUT";
  actions: Record<string, string[]>; // e.g. { "MOVE_LEFT": ["ArrowLeft", "KeyA"], "INTERACT": ["KeyE", "Space"] }
}

export interface StateComponent {
  type: "STATE";
  currentState: string;
  availableStates: string[];
}

export interface VariablesComponent {
  type: "VARIABLES";
  scopedVariables: Record<string, boolean | number | string>;
}

export interface ScriptComponent {
  type: "SCRIPT";
  scriptId: string;
  enabled: boolean;
}

export interface UIComponent {
  type: "UI";
  elementType: "BUTTON" | "PANEL" | "PROGRESS_BAR" | "DIALOGUE_BOX";
  text?: string;
  onClickAction?: GameAction;
}

export type GameComponent =
  | TransformComponent
  | SpriteComponent
  | TextComponent
  | AudioSourceComponent
  | ColliderComponent
  | InputComponent
  | StateComponent
  | VariablesComponent
  | ScriptComponent
  | UIComponent;

export interface GameEntity {
  id: string;
  sceneId: string;
  name: string;
  active: boolean;
  parentEntityId?: string;
  tags: string[];
  components: GameComponent[];
  metadata?: Record<string, unknown>;
}

export interface GameScene {
  id: string;
  name: string;
  description?: string;
  backgroundAssetId?: string;
  backgroundColor?: string;
  nextSceneIds?: string[];
  entityIds: string[];
  ruleIds: string[];
  metadata?: Record<string, unknown>;
}

export interface GameScript {
  id: string;
  name: string;
  path: string;
  content: string;
  language: "javascript" | "typescript";
  description?: string;
}

export interface InputActionMapping {
  action: string;
  keys: string[];
  description?: string;
}

export interface GameDocumentState {
  artifactId: string;
  entrySceneId: string;
  scenes: GameScene[];
  entities: GameEntity[];
  variables: GameVariable[];
  rules: GameRule[];
  scripts: GameScript[];
  inputActions: InputActionMapping[];
  selectedSceneId?: string;
  selectedEntityIds: string[];
  updatedAt: string;
}

export interface GameMetadata {
  gameType: GameType;
  targetPlatform: "WEB" | "LOCAL" | "OTHER";
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  entrySceneId: string;
  sceneCount: number;
  entityCount: number;
  ruleCount: number;
  sourceAssetIds: string[];
  currentBuildId?: string;
}

export interface GameItem {
  artifact: Artifact;
  metadata: GameMetadata;
  documentState: GameDocumentState;
}

export interface GameCreationPlan {
  title: string;
  gameType: GameType;
  concept: string;
  gameplayLoop: string;
  scenes: { name: string; description: string; entities: string[] }[];
  entities: { name: string; components: ComponentType[]; sceneName: string }[];
  mechanics: { name: string; description: string }[];
  variables: { name: string; type: VariableType; initialValue: any }[];
  requiredAssets: { name: string; type: "IMAGE" | "AUDIO" | "DATA" }[];
  runtimeRequirements: string[];
  capabilityWarnings: string[];
}

export interface GameInputEvent {
  tickId: number;
  timeMs: number;
  type: "ACTION_DOWN" | "ACTION_UP" | "CLICK";
  action?: string;
  entityId?: string;
  x?: number;
  y?: number;
}

export interface GameTestSession {
  id: string;
  artifactId: string;
  versionId: string;
  seed: number;
  startedAt: string;
  endedAt?: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "STOPPED";
  initialState: {
    activeSceneId: string;
    variables: Record<string, boolean | number | string>;
  };
  runtimeState: {
    activeSceneId: string;
    variables: Record<string, boolean | number | string>;
    simulationTick: number;
    simulationClockMs: number;
    score: number;
  };
  inputHistory: GameInputEvent[];
  logs: string[];
  errors: string[];
}

export interface GameBuildManifest {
  artifactId: string;
  versionId: string;
  buildId: string;
  timestamp: string;
  runtime: string;
  runtimeVersion: string;
  schemaVersion: string;
  targetPlatform: string;
  resolution: { width: number; height: number };
  assetIds: string[];
  entrypoint: string;
  sceneCount: number;
  entityCount: number;
}

export interface GameBuildResult {
  success: boolean;
  buildId?: string;
  assetId?: string;
  sizeBytes?: number;
  manifest?: GameBuildManifest;
  error?: string;
  warnings?: string[];
}

export interface GameRuntimeCapabilities {
  supportedGameTypes: GameType[];
  supportedComponents: ComponentType[];
  supportedTriggers: TriggerType[];
  supportedConditions: ConditionOperator[];
  supportedActions: ActionType[];
  webBuildAvailable: boolean;
  androidBuildAvailable: boolean;
  desktopBuildAvailable: boolean;
  maxEntitiesPerScene: number;
  maxRulesPerScene: number;
}

export type GameOperation =
  | { type: "CREATE_SCENE"; scene: GameScene }
  | { type: "UPDATE_SCENE"; sceneId: string; updates: Partial<GameScene> }
  | { type: "DELETE_SCENE"; sceneId: string }
  | { type: "CREATE_ENTITY"; entity: GameEntity }
  | { type: "UPDATE_ENTITY"; entityId: string; updates: Partial<GameEntity> }
  | { type: "DELETE_ENTITY"; entityId: string }
  | { type: "ADD_COMPONENT"; entityId: string; component: GameComponent }
  | { type: "REMOVE_COMPONENT"; entityId: string; componentType: ComponentType }
  | { type: "CREATE_VARIABLE"; variable: GameVariable }
  | { type: "UPDATE_VARIABLE"; variableId: string; updates: Partial<GameVariable> }
  | { type: "CREATE_RULE"; rule: GameRule }
  | { type: "UPDATE_RULE"; ruleId: string; updates: Partial<GameRule> }
  | { type: "DELETE_RULE"; ruleId: string }
  | { type: "SET_ENTRY_SCENE"; sceneId: string };

export interface GameChangeSet {
  id: string;
  artifactId: string;
  title: string;
  summary: string;
  operations: GameOperation[];
  plan?: GameCreationPlan;
  createdBy: "ATHENA" | "USER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface GameCommandHistoryState {
  past: GameDocumentState[];
  future: GameDocumentState[];
}

