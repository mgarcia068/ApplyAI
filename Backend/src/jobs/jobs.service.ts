import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobOffer } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly anthropic?: Anthropic;
  private readonly geminiApiKey?: string;
  private readonly gptApiKey?: string;
  private readonly xaiApiKey?: string;
  private readonly groqApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const geminiKey = this.getOptionalConfig('GEMINI_API_KEY');
    this.geminiApiKey = geminiKey;
    this.genAI = new GoogleGenerativeAI(geminiKey || '');

    const anthropicKey = this.getOptionalConfig('ANTHROPIC_API_KEY');
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : undefined;

    this.gptApiKey = this.getOptionalConfig('GPT_API_KEY');
    this.xaiApiKey = this.getOptionalConfig('XAI_API_KEY');
    this.groqApiKey = this.getOptionalConfig('GROQ_API_KEY');
  }

  private getOptionalConfig(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  async create(companyId: string, createJobDto: CreateJobDto): Promise<JobOffer> {
    const existingUser = await this.prisma.user.findUnique({ where: { id: companyId } });
    
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${companyId} not found`);
    }

    return this.prisma.jobOffer.create({
      data: {
        ...createJobDto,
        companyId,
      },
    });
  }

  async findAll(): Promise<JobOffer[]> {
    return this.prisma.jobOffer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        company: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<JobOffer> {
    try {
      const job = await this.prisma.jobOffer.update({
        where: { id },
        data: { views: { increment: 1 } },
        include: {
          company: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
      return job;
    } catch (e) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }
  }

  async findCompanyOffers(companyId: string): Promise<JobOffer[]> {
    return this.prisma.jobOffer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async recommendForCandidate(candidateUserId: string) {
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateUserId },
      include: {
        candidateProfile: {
          include: {
            cvAnalysis: true,
          },
        },
      },
    });

    if (!candidate || !candidate.candidateProfile) {
      return [];
    }

    const activeJobs = await this.prisma.jobOffer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!activeJobs.length) {
      return [];
    }

    const rankedJobs = this.rankJobsHeuristically(candidate.candidateProfile, activeJobs)
      .slice(0, 15)
      .map((entry) => entry.job);

    const recommendations = await this.generateRecommendationsWithFallback(
      candidate.candidateProfile,
      rankedJobs,
    );

    const scoreByJobId = new Map<string, { score: number; reason: string }>();
    recommendations.forEach((item) => {
      scoreByJobId.set(item.jobId, {
        score: item.score,
        reason: item.reason,
      });
    });

    return activeJobs
      .map((job) => {
        const rec = scoreByJobId.get(job.id);
        if (!rec) return null;

        return {
          jobId: job.id,
          score: rec.score,
          reason: rec.reason,
          title: job.title,
          company: job.company?.fullName || job.company?.email || 'Empresa',
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private tokenize(value: string): string[] {
    return this.normalizeText(value)
      .split(/[^a-z0-9#+.]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private getCandidateProfileText(candidateProfile: any): string {
    const cvAnalysis = candidateProfile?.cvAnalysis;
    return [
      candidateProfile?.name,
      candidateProfile?.location,
      candidateProfile?.bio,
      candidateProfile?.education,
      candidateProfile?.experience,
      Array.isArray(candidateProfile?.skills) ? candidateProfile.skills.join(', ') : '',
      Array.isArray(candidateProfile?.languages) ? candidateProfile.languages.join(', ') : '',
      cvAnalysis?.summary,
      Array.isArray(cvAnalysis?.skills) ? cvAnalysis.skills.join(', ') : '',
      Array.isArray(cvAnalysis?.technologies) ? cvAnalysis.technologies.join(', ') : '',
      Array.isArray(cvAnalysis?.experience) ? cvAnalysis.experience.join(', ') : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private rankJobsHeuristically(candidateProfile: any, jobs: any[]) {
    const candidateTokens = new Set(
      this.tokenize(this.getCandidateProfileText(candidateProfile)),
    );

    return jobs
      .map((job) => {
        const jobTokens = new Set(
          this.tokenize([
            job.title,
            job.description,
            ...(job.skillsRequired || []),
            job.location,
            job.modality,
          ].join(' ')),
        );

        let overlap = 0;
        jobTokens.forEach((token) => {
          if (candidateTokens.has(token)) overlap += 1;
        });

        const skillMatches = (job.skillsRequired || []).filter((skill: string) =>
          Array.from(candidateTokens).some((candidateToken) =>
            candidateToken === this.normalizeText(skill) || candidateToken.includes(this.normalizeText(skill)),
          ),
        ).length;

        const locationMatch = candidateProfile?.location
          ? this.normalizeText(candidateProfile.location) === this.normalizeText(job.location || '')
          : false;

        const score = Math.min(
          100,
          overlap * 6 + skillMatches * 14 + (locationMatch ? 8 : 0) + (job.minExperience === 0 ? 5 : 0),
        );

        return { job, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async generateRecommendationsWithFallback(candidateProfile: any, jobs: any[]) {
    const candidateText = this.getCandidateProfileText(candidateProfile);
    const prompt = `
Eres un recomendador de empleos para candidatos de tecnología.
Analiza el perfil del candidato y ordena las ofertas según su relevancia.

Reglas:
- Prioriza coincidencia de habilidades, tecnologías, seniority, ubicación y modalidad.
- Usa únicamente los IDs de las ofertas listadas.
- Devuelve un JSON estricto sin markdown ni texto extra.
- El formato debe ser: {"recommendations":[{"jobId":"...","score":0-100,"reason":"..."}]}
- Incluye como máximo 5 recomendaciones.

Perfil del candidato:
${candidateText}

Ofertas:
${jobs
  .map((job) => {
    const companyName = job.company?.fullName || job.company?.email || 'Empresa';
    return `- ID: ${job.id}\n  Título: ${job.title}\n  Empresa: ${companyName}\n  Ubicación: ${job.location || 'No especificada'}\n  Modalidad: ${job.modality}\n  Experiencia mínima: ${job.minExperience}\n  Habilidades: ${(job.skillsRequired || []).join(', ')}\n  Descripción: ${String(job.description || '').slice(0, 450)}`;
  })
  .join('\n\n')}
`.trim();

    const heuristicFallback = this.rankJobsHeuristically(candidateProfile, jobs)
      .slice(0, 5)
      .map((entry) => ({
        jobId: entry.job.id,
        score: Math.max(35, Math.round(entry.score)),
        reason: 'Coincide con tu perfil y habilidades detectadas.',
      }));

    try {
      const rawText = await this.generateTextWithFallback(prompt);
      const normalized = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(normalized);
      const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];

      const allowedIds = new Set(jobs.map((job) => job.id));
      const deduped: Array<{ jobId: string; score: number; reason: string }> = [];

      for (const item of recommendations) {
        const jobId = String(item?.jobId || '').trim();
        if (!jobId || !allowedIds.has(jobId)) continue;
        if (deduped.some((entry) => entry.jobId === jobId)) continue;

        deduped.push({
          jobId,
          score: Math.max(0, Math.min(100, Math.round(Number(item?.score) || 0))),
          reason: String(item?.reason || '').trim() || 'Recomendado por tu perfil.',
        });
      }

      if (deduped.length) {
        return deduped.sort((a, b) => b.score - a.score).slice(0, 5);
      }
    } catch (error) {
      console.error('Error generando recomendaciones con IA:', error);
    }

    return heuristicFallback;
  }

  private async generateTextWithGemini(prompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured.');
    }
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  private async generateTextWithAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured.');
    }

    const result = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = '';
    for (const block of result.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Anthropic returned empty response.');
    }

    return trimmed;
  }

  private async generateTextWithGpt(prompt: string): Promise<string> {
    if (!this.gptApiKey) {
      throw new Error('GPT API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'GPT',
      apiKey: this.gptApiKey,
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithXai(prompt: string): Promise<string> {
    if (!this.xaiApiKey) {
      throw new Error('XAI API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'XAI',
      apiKey: this.xaiApiKey,
      url: 'https://api.x.ai/v1/chat/completions',
      model: 'grok-3-mini',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithGroq(prompt: string): Promise<string> {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured.');
    }

    return this.generateTextWithOpenAiCompatible({
      provider: 'GROQ',
      apiKey: this.groqApiKey,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 1500,
      temperature: 0.2,
      prompt,
    });
  }

  private async generateTextWithOpenAiCompatible(options: {
    provider: string;
    apiKey: string;
    url: string;
    model: string;
    maxTokens: number;
    temperature: number;
    prompt: string;
  }): Promise<string> {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const errorBody = await this.safeReadJson(response);
      throw this.buildProviderError(options.provider, response.status, errorBody);
    }

    const data = await response.json().catch(() => undefined);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error(`${options.provider} returned empty response.`);
    }

    return text;
  }

  private async safeReadJson(response: { json: () => Promise<any> }): Promise<any> {
    try {
      return await response.json();
    } catch (_) {
      return undefined;
    }
  }

  private buildProviderError(provider: string, status: number, body: any): Error {
    const message =
      body?.error?.message ||
      body?.message ||
      `${provider} request failed with status ${status}.`;
    const code = body?.error?.code || body?.code;

    const error = new Error(message);
    (error as any).provider = provider;
    (error as any).status = status;
    if (code) (error as any).code = code;
    if (body) (error as any).raw = body;
    return error;
  }

  private isTokensExhausted(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || error?.raw?.error?.code || '').toLowerCase();
    const type = String(error?.raw?.error?.type || '').toLowerCase();
    const status = Number(
      error?.status || error?.statusCode || error?.response?.status || error?.raw?.status,
    );

    const hints = ['insufficient', 'quota', 'exceeded', 'token', 'billing', 'credit'];
    const hasHint = hints.some((hint) =>
      message.includes(hint) || code.includes(hint) || type.includes(hint),
    );

    return (status === 402 || status === 429) && hasHint;
  }

  private async generateTextWithFallback(prompt: string): Promise<string> {
    const attempts: Array<{ name: string; fn: () => Promise<string> }> = [];

    if (this.geminiApiKey) attempts.push({ name: 'Gemini', fn: () => this.generateTextWithGemini(prompt) });
    if (this.groqApiKey) attempts.push({ name: 'Groq', fn: () => this.generateTextWithGroq(prompt) });
    if (this.anthropic) attempts.push({ name: 'Anthropic', fn: () => this.generateTextWithAnthropic(prompt) });
    if (this.gptApiKey) attempts.push({ name: 'GPT', fn: () => this.generateTextWithGpt(prompt) });
    if (this.xaiApiKey) attempts.push({ name: 'XAI', fn: () => this.generateTextWithXai(prompt) });

    if (!attempts.length) {
      throw new Error('No AI providers configured.');
    }

    let tokenIssue = false;
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        return await attempt.fn();
      } catch (error) {
        tokenIssue = tokenIssue || this.isTokensExhausted(error);
        lastError = error;
        console.error(`${attempt.name} failed:`, error);
      }
    }

    if (tokenIssue) {
      const error = new Error('AI_TOKENS_EXHAUSTED');
      (error as any).code = 'AI_TOKENS_EXHAUSTED';
      throw error;
    }

    throw (lastError || new Error('All AI providers failed.')) as Error;
  }

  async update(id: string, updateJobDto: any, companyId: string): Promise<JobOffer> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }
    if (job.companyId !== companyId) {
      throw new NotFoundException(`JobOffer not found or not owned by you`);
    }

    return this.prisma.jobOffer.update({
      where: { id },
      data: updateJobDto,
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`JobOffer with ID ${id} not found`);
    }
    if (job.companyId !== companyId) {
      throw new NotFoundException(`JobOffer not found or not owned by you`);
    }

    await this.prisma.jobOffer.delete({
      where: { id },
    });
  }
}
