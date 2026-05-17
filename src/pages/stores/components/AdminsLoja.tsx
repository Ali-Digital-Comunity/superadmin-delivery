import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Loader2, Save, ShieldCheck } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { usuarioService, type Usuario } from "../../../features/usuarios/usuarioService";

const adminSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().optional().or(z.literal("")),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type AdminFormValues = z.infer<typeof adminSchema>;

interface AdminsLojaProps {
  lojaId: string;
  lojaNome: string;
}

type UsuariosResponse = Usuario[] | {
  data?: Usuario[] | {
    data?: Usuario[];
  };
};

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: string | { message?: string };
      message?: string;
    };
  };
};

function normalizeUsuarios(data: unknown): Usuario[] {
  const response = data as UsuariosResponse;

  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
}

function getErrorMessage(err: unknown) {
  const apiError = err as ApiErrorResponse;
  const error = apiError.response?.data?.error;

  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof apiError.response?.data?.message === "string") return apiError.response.data.message;

  return "Erro ao criar administrador.";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ativo":
      return <Badge variant="success">Ativo</Badge>;
    case "inativo":
      return <Badge variant="secondary">Inativo</Badge>;
    case "bloqueado":
      return <Badge variant="destructive">Bloqueado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminsLoja({ lojaId, lojaNome }: AdminsLojaProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      senha: "",
    },
  });

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["usuarios", lojaId, "administradores"],
    queryFn: () => usuarioService.getAll({ loja_id: lojaId, perfil: "administrador" }),
  });

  const admins = useMemo(() => normalizeUsuarios(data), [data]);

  const mutation = useMutation({
    mutationFn: (form: AdminFormValues) => usuarioService.create({
      loja_id: lojaId,
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      telefone: form.telefone?.trim() || null,
      senha: form.senha,
      perfil: "administrador",
      status: "ativo",
    }),
    onSuccess: () => {
      reset();
      setError("");
      setSuccess("Administrador criado e vinculado ao mercado.");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuarios", lojaId, "administradores"] });
    },
    onError: (err: unknown) => {
      setSuccess("");
      setError(getErrorMessage(err));
    },
  });

  const onSubmit = (form: AdminFormValues) => {
    setError("");
    setSuccess("");
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administrador do Mercado
          </CardTitle>
          <CardDescription>
            Crie uma conta administrativa já vinculada a {lojaNome}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-100/60 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-100/60 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin_nome">Nome completo <span className="text-red-500">*</span></Label>
                <Input
                  id="admin_nome"
                  placeholder="Ex: João da Silva"
                  {...register("nome")}
                  className={errors.nome ? "border-red-500" : ""}
                />
                {errors.nome && <span className="text-xs text-red-500">{errors.nome.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_email">E-mail <span className="text-red-500">*</span></Label>
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="admin@mercado.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_telefone">Telefone</Label>
                <Input
                  id="admin_telefone"
                  placeholder="(00) 00000-0000"
                  {...register("telefone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_senha">Senha <span className="text-red-500">*</span></Label>
                <Input
                  id="admin_senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...register("senha")}
                  className={errors.senha ? "border-red-500" : ""}
                />
                {errors.senha && <span className="text-xs text-red-500">{errors.senha.message}</span>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {mutation.isPending ? "Criando..." : "Criar Administrador"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administradores vinculados</CardTitle>
          <CardDescription>Contas que conseguem acessar o painel administrativo deste mercado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando administradores...
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-red-500">
                    Erro ao carregar administradores.
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum administrador vinculado a este mercado.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>{admin.nome}</span>
                        {admin.telefone && (
                          <span className="block text-xs text-muted-foreground">{admin.telefone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{getStatusBadge(admin.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/users/${admin.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Editar administrador">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
