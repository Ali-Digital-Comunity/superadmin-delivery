import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderTree,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { categoriaService, type Categoria } from "../../features/categorias/categoriaService";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

type TreeCategoria = Categoria & {
  filhos?: TreeCategoria[];
  childrenLoaded?: boolean;
  isLoadingChildren?: boolean;
};

const levelLabels: Record<number, string> = {
  1: "Departamento",
  2: "Categoria",
  3: "Subcategoria",
};

const emojiOptions = ["🛒", "🥛", "🥤", "🥦", "🥩", "🍞", "🧹", "🧴", "🍎", "🧂", "🐟", "🍷", "🧃", "❄️", "📁"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeList(payload: unknown): Categoria[] {
  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data as Categoria[];
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as Categoria[];
  if (Array.isArray(payload)) return payload;
  return [];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) return fallback;
  const data = error.response.data;
  if (isRecord(data.error) && typeof data.error.message === "string") return data.error.message;
  if (typeof data.message === "string") return data.message;
  return fallback;
}

function buildSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function sortTree(items: TreeCategoria[]) {
  items.sort((a, b) => (a.ordem_exibicao ?? 0) - (b.ordem_exibicao ?? 0) || a.nome.localeCompare(b.nome));
  items.forEach((item) => sortTree(item.filhos ?? []));
  return items;
}

function buildTree(categorias: Categoria[], options: { childrenLoaded?: boolean } = {}) {
  const byId = new Map<string, TreeCategoria>(categorias.map((categoria) => [categoria.id, { ...categoria, filhos: [] as TreeCategoria[] }]));
  const roots: TreeCategoria[] = [];

  byId.forEach((categoria) => {
    if (categoria.categoria_pai_id && byId.has(categoria.categoria_pai_id)) {
      byId.get(categoria.categoria_pai_id)!.filhos!.push(categoria);
    } else {
      roots.push(categoria);
    }
  });

  if (options.childrenLoaded) {
    byId.forEach((categoria) => {
      categoria.childrenLoaded = true;
    });
  }

  return sortTree(roots);
}

function buildLazyTree(
  departments: Categoria[],
  childrenByParentId: Record<string, Categoria[]>,
  loadedChildrenIds: Set<string>,
  loadingChildrenIds: Set<string>
) {
  const attachChildren = (categoria: Categoria): TreeCategoria => {
    const children = childrenByParentId[categoria.id] ?? [];

    return {
      ...categoria,
      filhos: children.map(attachChildren),
      childrenLoaded: loadedChildrenIds.has(categoria.id),
      isLoadingChildren: loadingChildrenIds.has(categoria.id),
    };
  };

  return sortTree(departments.map(attachChildren));
}

function flattenTree(items: TreeCategoria[]) {
  const flattened: Categoria[] = [];

  const collect = (nodes: TreeCategoria[]) => {
    nodes.forEach((node) => {
      flattened.push(node);
      collect(node.filhos ?? []);
    });
  };

  collect(items);
  return flattened;
}

function categoryMatchesSearch(categoria: TreeCategoria, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const ownText = `${categoria.nome} ${categoria.slug ?? ""} ${categoria.caminho ?? ""}`.toLowerCase();
  return ownText.includes(term) || (categoria.filhos ?? []).some((child) => categoryMatchesSearch(child, term));
}

function filterTree(items: TreeCategoria[], search: string): TreeCategoria[] {
  const term = search.trim();
  if (!term) return items;

  return items
    .map((item) => ({
      ...item,
      filhos: filterTree(item.filhos ?? [], term),
    }))
    .filter((item) => categoryMatchesSearch(item, term));
}

function CategoriaRow({
  categoria,
  depth,
  expandedIds,
  onToggleExpanded,
  onEdit,
  onDelete,
  forceExpanded = false,
}: {
  categoria: TreeCategoria;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpanded: (categoria: TreeCategoria) => void;
  onEdit: (categoria: Categoria) => void;
  onDelete: (id: string) => void;
  forceExpanded?: boolean;
}) {
  const filhos = categoria.filhos ?? [];
  const level = categoria.nivel ?? 1;
  const canHaveChildren = level < 3;
  const hasChildren = filhos.length > 0;
  const canToggle = canHaveChildren || hasChildren;
  const isExpanded = forceExpanded || expandedIds.has(categoria.id);
  const grandChildrenCount = filhos.reduce((total, child) => total + (child.filhos?.length ?? 0), 0);
  const childLabel = level === 1 ? "categorias" : "subcategorias";

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] xl:grid-cols-[1fr_120px_170px_80px_110px] gap-2 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950">
        <div
          className={`min-w-0 ${canToggle ? "cursor-pointer" : ""}`}
          style={{ paddingLeft: depth * 18 }}
          role={canToggle ? "button" : undefined}
          tabIndex={canToggle ? 0 : undefined}
          onClick={() => canToggle && !categoria.isLoadingChildren && onToggleExpanded(categoria)}
          onKeyDown={(event) => {
            if (canToggle && !categoria.isLoadingChildren && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onToggleExpanded(categoria);
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              disabled={!canToggle || categoria.isLoadingChildren}
              onClick={(event) => {
                event.stopPropagation();
                if (canToggle) onToggleExpanded(categoria);
              }}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${canToggle ? "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" : "cursor-default text-slate-200"}`}
              title={canToggle ? (isExpanded ? "Recolher" : `Carregar ${childLabel}`) : "Sem filhos"}
            >
              {canToggle && isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className="text-lg leading-none">{categoria.emoji || "📁"}</span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{categoria.nome}</span>
                <span className="xl:hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                  N{level}
                </span>
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {categoria.isLoadingChildren
                  ? `Carregando ${childLabel}...`
                  : hasChildren
                  ? `${filhos.length} filho${filhos.length === 1 ? "" : "s"}${grandChildrenCount ? ` · ${grandChildrenCount} subcategoria${grandChildrenCount === 1 ? "" : "s"}` : ""}`
                  : canHaveChildren && !categoria.childrenLoaded
                    ? `Clique para carregar ${childLabel}`
                    : canHaveChildren
                      ? `Nenhuma ${childLabel.slice(0, -1)} cadastrada`
                  : categoria.caminho || categoria.slug || categoria.nome}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden text-xs text-slate-600 xl:block dark:text-slate-300">{levelLabels[level]}</div>
        <div className="hidden truncate text-xs text-slate-500 xl:block">{categoria.categoria_pai_nome || "-"}</div>
        <div className="hidden text-xs text-slate-500 xl:block">{categoria.ordem_exibicao ?? 0}</div>

        <div className="flex items-center justify-end gap-1">
          {categoria.ativa ? (
            <Badge variant="outline" className="hidden gap-1 border-green-200 bg-green-50 text-green-600 sm:inline-flex">
              <CheckCircle className="h-3 w-3" />
              Ativa
            </Badge>
          ) : (
            <Badge variant="outline" className="hidden gap-1 border-slate-200 bg-slate-50 text-slate-400 sm:inline-flex">
              <XCircle className="h-3 w-3" />
              Inativa
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(categoria)} className="h-8 w-8 text-slate-400 hover:text-primary">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(categoria.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded &&
        filhos.map((child) => (
          <CategoriaRow
            key={child.id}
            categoria={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpanded={onToggleExpanded}
            onEdit={onEdit}
            onDelete={onDelete}
            forceExpanded={forceExpanded}
          />
        ))}
    </>
  );
}

export default function CategoriasList() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [childrenByParentId, setChildrenByParentId] = useState<Record<string, Categoria[]>>({});
  const [loadedChildrenIds, setLoadedChildrenIds] = useState<Set<string>>(new Set());
  const [loadingChildrenIds, setLoadingChildrenIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const queryClient = useQueryClient();
  const searchTerm = search.trim();

  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ["categorias", "departamentos"],
    queryFn: categoriaService.getDepartments,
  });

  const { data: allCategoriesData, isFetching: isFetchingAllCategories } = useQuery({
    queryKey: ["categorias", "all"],
    queryFn: categoriaService.getAll,
    enabled: isModalOpen || searchTerm.length > 0,
  });

  const departments = useMemo(() => normalizeList(departmentsData), [departmentsData]);
  const lazyTree = useMemo(
    () => buildLazyTree(departments, childrenByParentId, loadedChildrenIds, loadingChildrenIds),
    [departments, childrenByParentId, loadedChildrenIds, loadingChildrenIds]
  );
  const searchCategories = useMemo(() => normalizeList(allCategoriesData), [allCategoriesData]);
  const searchTree = useMemo(() => buildTree(searchCategories, { childrenLoaded: true }), [searchCategories]);
  const visibleTree = useMemo(
    () => (searchTerm ? filterTree(searchTree, searchTerm) : lazyTree),
    [lazyTree, searchTerm, searchTree]
  );
  const loadedCategorias = useMemo(() => flattenTree(lazyTree), [lazyTree]);
  const modalCategorias = useMemo(() => {
    const allCategories = normalizeList(allCategoriesData);
    return allCategories.length > 0 ? allCategories : loadedCategorias;
  }, [allCategoriesData, loadedCategorias]);
  const totalLoadedCategorias = loadedCategorias.length;

  const resetLoadedChildren = () => {
    setChildrenByParentId({});
    setLoadedChildrenIds(new Set());
    setLoadingChildrenIds(new Set());
    setExpandedIds(new Set());
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      resetLoadedChildren();
      setMessage({ type: "success", text: "Categoria excluída com sucesso" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => {
      setMessage({ type: "error", text: "Erro ao excluir categoria. Verifique se ela tem filhos ou produtos vinculados." });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Excluir esta categoria? Categorias com filhos ou produtos vinculados serão bloqueadas pelo sistema.")) {
      deleteMutation.mutate(id);
    }
  };

  const loadChildren = async (categoria: TreeCategoria) => {
    const id = categoria.id;

    setLoadingChildrenIds((current) => new Set(current).add(id));

    try {
      const children = await categoriaService.getChildren(id);
      setChildrenByParentId((current) => ({ ...current, [id]: children }));
      setLoadedChildrenIds((current) => new Set(current).add(id));
    } catch {
      setMessage({ type: "error", text: "Erro ao carregar categorias filhas." });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoadingChildrenIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleExpanded = (categoria: TreeCategoria) => {
    const id = categoria.id;
    const isExpanded = expandedIds.has(id);

    setExpandedIds((current) => {
      const next = new Set(current);
      if (isExpanded) next.delete(id);
      else next.add(id);
      return next;
    });

    if (!isExpanded && (categoria.nivel ?? 1) < 3 && !loadedChildrenIds.has(id) && !loadingChildrenIds.has(id)) {
      void loadChildren(categoria);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategoria(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategoria(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorias Globais</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {departments.length} departamentos · {totalLoadedCategorias} itens carregados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar categoria, slug ou caminho..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_120px_170px_80px_110px] gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 xl:grid">
          <span>Nome e caminho</span>
          <span>Nível</span>
          <span>Pai</span>
          <span>Ordem</span>
          <span className="text-right">Ações</span>
        </div>

        {isLoading || (searchTerm && isFetchingAllCategories && searchCategories.length === 0) ? (
          <div className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
            {searchTerm ? "Buscando categorias..." : "Carregando departamentos..."}
          </div>
        ) : visibleTree.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          visibleTree.map((categoria) => (
            <CategoriaRow
              key={categoria.id}
              categoria={categoria}
              depth={0}
              expandedIds={expandedIds}
              onToggleExpanded={handleToggleExpanded}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              forceExpanded={searchTerm.length > 0}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold">{editingCategoria ? "Editar Categoria" : "Nova Categoria"}</h3>
              <Button type="button" variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <CategoriaFormModal
                categoria={editingCategoria}
                categorias={modalCategorias}
                isLoadingCategorias={isFetchingAllCategories}
                onSaved={resetLoadedChildren}
                onClose={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriaFormModal({
  categoria,
  categorias,
  isLoadingCategorias,
  onSaved,
  onClose,
}: {
  categoria: Categoria | null;
  categorias: Categoria[];
  isLoadingCategorias: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [emoji, setEmoji] = useState(categoria?.emoji ?? "📁");
  const [slug, setSlug] = useState(categoria?.slug ?? "");
  const [ordem, setOrdem] = useState(String(categoria?.ordem_exibicao ?? 0));
  const [ativa, setAtiva] = useState(categoria?.ativa ?? true);
  const [parentId, setParentId] = useState(categoria?.categoria_pai_id ?? "");

  const parent = categorias.find((item) => item.id === parentId);
  const targetLevel = parent ? (parent.nivel ?? 1) + 1 : 1;
  const parentOptions = categorias.filter((item) => item.id !== categoria?.id && (item.nivel ?? 1) < 3);
  const currentPath = categoria?.caminho || categoria?.nome;

  const mutation = useMutation({
    mutationFn: (data: Partial<Categoria>) => (categoria ? categoriaService.update(categoria.id, data) : categoriaService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      onSaved();
      onClose();
    },
    onError: (error: unknown) => {
      alert(getApiErrorMessage(error, "Erro ao salvar categoria"));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finalSlug = slug.trim() || buildSlug(nome);
    mutation.mutate({
      nome: nome.trim(),
      slug: finalSlug,
      emoji: emoji || null,
      ordem_exibicao: Number(ordem) || 0,
      ativa,
      categoria_pai_id: parentId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {currentPath && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Caminho atual: <span className="font-semibold">{currentPath}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(event) => {
              setNome(event.target.value);
              if (!categoria) setSlug(buildSlug(event.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" value={emoji ?? ""} onChange={(event) => setEmoji(event.target.value)} className="text-center text-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria_pai_id">Categoria pai</Label>
        <select
          id="categoria_pai_id"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={isLoadingCategorias}
        >
          <option value="">{isLoadingCategorias ? "Carregando categorias..." : "Sem pai - Departamento"}</option>
          {parentOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {"  ".repeat(Math.max((item.nivel ?? 1) - 1, 0))}
              {item.emoji || "📁"} {item.caminho || item.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        Será salvo como <strong>{levelLabels[targetLevel] || "Nível inválido"}</strong> / nível {targetLevel}.
      </div>

      <div className="space-y-2">
        <Label>Emoji rápido</Label>
        <div className="grid grid-cols-8 gap-2">
          {emojiOptions.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setEmoji(option)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${emoji === option ? "border-primary bg-slate-100" : "border-transparent bg-slate-50 hover:bg-slate-100"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" value={slug} onChange={(event) => setSlug(buildSlug(event.target.value))} placeholder="ex: laticinios" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ordem">Ordem</Label>
          <Input id="ordem" type="number" value={ordem} onChange={(event) => setOrdem(event.target.value)} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={ativa} onChange={(event) => setAtiva(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm font-medium">Ativa</span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !nome.trim() || targetLevel > 3}>
          {mutation.isPending ? "Salvando..." : "Salvar Categoria"}
        </Button>
      </div>
    </form>
  );
}
