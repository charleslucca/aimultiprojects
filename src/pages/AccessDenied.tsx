import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acesso Negado</CardTitle>
          <CardDescription>
            Seu email não está autorizado a acessar este sistema
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Como obter acesso?
            </h4>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador do sistema para solicitar 
              a inclusão do seu email na lista de usuários autorizados.
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded border-l-2 border-muted-foreground/20">
            <strong>Nota:</strong> Apenas emails previamente cadastrados pelo 
            administrador podem criar contas e acessar o sistema.
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
            <Button 
              onClick={() => window.location.href = 'mailto:admin@empresa.com?subject=Solicitar Acesso ao Sistema'}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contatar Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;