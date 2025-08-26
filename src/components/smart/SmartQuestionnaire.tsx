import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Save, FileUp, CheckCircle, Circle } from "lucide-react";

export interface QuestionnaireQuestion {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'number';
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description?: string;
  questions: QuestionnaireQuestion[];
}

interface SmartQuestionnaireProps {
  sections: QuestionnaireSection[];
  data?: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onFileUpload?: (sectionId: string) => React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  autoSave?: boolean;
}

export function SmartQuestionnaire({
  sections,
  data = {},
  onSave,
  onFileUpload,
  className,
  title,
  description,
  autoSave = true
}: SmartQuestionnaireProps) {
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    setFormData(data);
  }, [data]);

  useEffect(() => {
    if (autoSave) {
      const timeoutId = setTimeout(() => {
        onSave(formData);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, autoSave, onSave]);

  const updateFormData = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const isSectionComplete = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const requiredQuestions = section.questions.filter(q => q.required);
    
    return requiredQuestions.every(question => {
      const value = formData[question.id];
      if (question.type === 'checkbox') {
        return Array.isArray(value) && value.length > 0;
      }
      return value !== undefined && value !== '' && value !== null;
    });
  };

  const handleSectionComplete = (sectionIndex: number) => {
    if (isSectionComplete(sectionIndex)) {
      setCompletedSections(prev => new Set([...prev, sectionIndex]));
      
      if (sectionIndex < sections.length - 1) {
        setCurrentSection(sectionIndex + 1);
      }
    } else {
      toast({
        title: "Seção incompleta",
        description: "Preencha todos os campos obrigatórios antes de continuar.",
        variant: "destructive",
      });
    }
  };

  const handleManualSave = () => {
    onSave(formData);
    toast({
      title: "Salvo com sucesso",
      description: "Suas respostas foram salvas.",
    });
  };

  const getProgress = () => {
    const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0);
    const answeredQuestions = Object.keys(formData).filter(key => {
      const value = formData[key];
      return value !== undefined && value !== '' && value !== null;
    }).length;
    
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const renderQuestion = (question: QuestionnaireQuestion) => {
    const value = formData[question.id];

    switch (question.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full min-h-[100px]"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateFormData(question.id, Number(e.target.value))}
            placeholder={question.placeholder}
            min={question.validation?.min}
            max={question.validation?.max}
            className="w-full"
          />
        );

      case 'radio':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={(newValue) => updateFormData(question.id, newValue)}
            className="space-y-2"
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => {
              const currentValues = Array.isArray(value) ? value : [];
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={currentValues.includes(option)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      updateFormData(question.id, newValues);
                    }}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {title && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
      )}

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Geral</span>
              <span>{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map((section, index) => {
          const isCompleted = completedSections.has(index);
          const isCurrent = index === currentSection;
          
          return (
            <Button
              key={section.id}
              variant={isCurrent ? 'default' : isCompleted ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setCurrentSection(index)}
              className="flex items-center gap-2"
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {section.title}
            </Button>
          );
        })}
      </div>

      {/* Current Section */}
      {sections[currentSection] && (
        <Card>
          <CardHeader>
            <CardTitle>{sections[currentSection].title}</CardTitle>
            {sections[currentSection].description && (
              <CardDescription>{sections[currentSection].description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            {onFileUpload && (
              <div className="border-2 border-dashed border-muted rounded-lg p-4">
                <div className="text-center">
                  <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Anexe arquivos para complementar suas respostas
                  </p>
                  {onFileUpload(sections[currentSection].id)}
                </div>
              </div>
            )}

            {/* Questions */}
            {sections[currentSection].questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    {question.title}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                </div>
                
                {question.description && (
                  <p className="text-xs text-muted-foreground">{question.description}</p>
                )}
                
                {renderQuestion(question)}
              </div>
            ))}

            {/* Section Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                {!autoSave && (
                  <Button variant="outline" onClick={handleManualSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                )}

                {currentSection < sections.length - 1 ? (
                  <Button onClick={() => handleSectionComplete(currentSection)}>
                    Próxima Seção
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleSectionComplete(currentSection)}
                    variant="default"
                  >
                    Concluir
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}