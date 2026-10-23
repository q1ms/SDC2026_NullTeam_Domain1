import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { skillsMatch, type RankedRole, type Scenario } from '@/lib/career-model';
import { buildLayout, roleNodeId, type EdgeData, type RoleNodeData, type SkillNodeData } from '@/lib/graph-layout';

const hid = { top: '50%', left: '50%', opacity: 0, pointerEvents: 'none' as const };
const Anchors = () => (<><Handle type="target" position={Position.Top} style={hid} /><Handle type="source" position={Position.Bottom} style={hid} /></>);

function UserNode() {
  return <div className="g-user" aria-label="You, at the center of your skill ecosystem"><Anchors /><span>You</span></div>;
}
function SkillNode({ data }: NodeProps<Node<SkillNodeData, 'skill'>>) {
  return <div className={`g-skill ${data.dim ? 'is-dim' : ''}`}><Anchors />{data.label}</div>;
}
function RoleNode({ data }: NodeProps<Node<RoleNodeData, 'role'>>) {
  const state = data.declining ? 'declining' : data.emerging ? 'emerging' : 'steady';
  return (
    <div className={`g-role ${state} ${data.fast ? 'fast' : ''} ${data.selected ? 'is-selected' : ''}`} style={{ ['--s' as string]: data.scale }}>
      <Anchors />
      <button type="button" className="g-role-card" aria-pressed={data.selected} data-testid={`node-role-${data.id}`}
        aria-label={`${data.title}, ${state} role, ${data.growth > 0 ? '+' : ''}${data.growth} percent growth, fit ${data.match} percent. Select to inspect.`}
        onClick={() => data.onSelect(data.id)}>
        <span className="g-role-title">{data.title}</span>
        <span className="g-role-meta">{data.growth > 0 ? '+' : ''}{data.growth}% · fit {data.match}</span>
      </button>
      {data.sdgs.length > 0 && <div className="g-sdgs" aria-hidden="true">{data.sdgs.map((s, i) => <span key={s} className={data.selected ? 'on' : ''} style={{ animationDelay: `${i * 0.6}s` }}>{s}</span>)}</div>}
    </div>
  );
}
const nodeTypes = { user: UserNode, skill: SkillNode, role: RoleNode };

type Props = { ranked: RankedRole[]; skills: string[]; selectedId: string | null; onSelect: (id: string) => void; scenario: Scenario };

function Inner({ ranked, skills, selectedId, onSelect, scenario }: Props) {
  const layout = useMemo(() => buildLayout(ranked, skills, scenario), [ranked, skills, scenario]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(layout.nodes);
  const [settling, setSettling] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { fitView, setCenter } = useReactFlow();
  const selected = ranked.find((r) => r.id === selectedId) ?? null;
  const stable = useCallback((id: string) => onSelect(id), [onSelect]);

  useEffect(() => { setNodes(layout.nodes); }, [layout, setNodes]);
  useEffect(() => { setSettling(true); const t = setTimeout(() => setSettling(false), 280); return () => clearTimeout(t); }, [scenario]);
  const rolesKey = ranked.map((r) => r.id).sort().join('|');
  useEffect(() => {
    const t = setTimeout(() => {
      if ((canvasRef.current?.clientWidth ?? 1000) <= 700) void setCenter(0, -40, { zoom: .85, duration: 0 });
      else void fitView({ padding: .17, duration: 0 });
    }, 60);
    return () => clearTimeout(t);
  }, [rolesKey, fitView, setCenter]);
  useEffect(() => {
    if (!selectedId || (canvasRef.current?.clientWidth ?? 1000) > 700) return;
    const node = layout.nodes.find((item) => item.id === roleNodeId(selectedId));
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void setCenter(node.position.x + 88, node.position.y + 31 + (canvasRef.current?.clientHeight ?? 600) * .2, { zoom: 1, duration: reduce ? 0 : 240 });
    // Only recenter for an explicit role selection, not for a scenario ripple or drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, setCenter]);

  const shown = useMemo(() => nodes.map((n) => {
    if (n.type === 'role') { const d = n.data as RoleNodeData; return { ...n, data: { ...d, selected: d.id === selectedId, onSelect: stable } }; }
    if (n.type === 'skill' && selected) { const d = n.data as SkillNodeData; return { ...n, data: { ...d, dim: !selected.matches.some((m) => skillsMatch(d.label, m)) } }; }
    return n;
  }), [nodes, selectedId, selected, stable]);

  const edges = useMemo(() => layout.edges.map((e) => {
    const d = e.data as EdgeData;
    const role = d.roleId ? ranked.find((r) => r.id === d.roleId) : undefined;
    const tone = role ? (role.growth < 0 ? 'neg' : 'pos') : 'core';
    const lit = selected ? d.roleId === selected.id : false;
    const cls = ['g-edge', d.kind, tone, selected ? (lit || d.kind === 'core' ? 'lit' : 'dim') : ''].join(' ');
    return { ...e, className: cls, label: d.kind === 'gap' && lit ? 'gap: no shared skills yet' : undefined, selectable: false, focusable: false };
  }), [layout, ranked, selected]);

  return (
    <div ref={canvasRef} className={`graph-canvas scenario-${scenario} ${settling ? 'settling' : ''}`}>
      <ReactFlow nodes={shown} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
        minZoom={0.15} maxZoom={2} fitView fitViewOptions={{ padding: 0.17 }} nodesFocusable
        onNodeDragStart={() => setSettling(false)}
        onPaneClick={() => undefined} aria-label="Skill and future role ecosystem graph. Drag to move, scroll or pinch to zoom.">
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1d2a30" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap pannable zoomable position="bottom-right" className="g-minimap" maskColor="rgba(10,10,10,.75)"
          nodeColor={(n) => n.type === 'role' ? ((n.data as RoleNodeData).declining ? '#ff3b5c' : (n.data as RoleNodeData).emerging ? '#2dff9a' : '#27b8ff') : '#2f3d44'} />
      </ReactFlow>
    </div>
  );
}
export default function EcosystemGraph(props: Props) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>;
}
