"use client";
import { useState, useRef, useEffect } from "react";
import { RiSendPlane2Line, RiSparklingLine } from "react-icons/ri";
import { findGuideTopic, type GuideTopic } from "@/lib/missionGuide";

export function MissionGuide({ welcome, context, topics }: {welcome:string; context?:string; topics:GuideTopic[]}) {
  const log=useRef<HTMLDivElement>(null);
  const [question,setQuestion] = useState("");
  const [messages,setMessages] = useState<{role:"user"|"guide";text:string}[]>([]);
  useEffect(()=>{if(log.current) log.current.scrollTop=log.current.scrollHeight;},[messages]);
  const ask = (text:string) => {
    if (!text.trim()) return;
    const topic = findGuideTopic(text,topics);
    topic?.action?.();
    setMessages(previous => [...previous,{role:"user" as const,text:text.trim()},{role:"guide" as const,text:topic?.answer ?? "I can help with this page. Choose a question below, or ask about one of those topics."}].slice(-4));
    setQuestion("");
  };
  return <aside className="mission-guide" aria-label="Mission guide">
    <div className="guide-heading"><span className="guide-avatar"><RiSparklingLine /></span><div><strong>Your mission guide</strong><small>Simple help for this view</small></div><span className="guide-presence" /></div>
    <div className="guide-log" ref={log}><div className="guide-bubble">{welcome}</div>{context && <p className="guide-context">{context}</p>}{messages.map((message,i) => <div key={`${i}-${message.text}`} className={`guide-bubble ${message.role === "user" ? "guide-user" : ""}`}>{message.text}</div>)}</div>
    <div className="guide-reply" aria-live="polite">{messages.at(-1)?.text}</div>
    <div className="guide-suggestions">{topics.filter(topic=>!topic.hidden).map(topic => <button key={topic.label} type="button" onClick={()=>ask(topic.label)}>{topic.label}</button>)}</div>
    <form onSubmit={event=>{event.preventDefault();ask(question);}} className="guide-input"><input aria-label="Ask mission guide" value={question} onChange={event=>setQuestion(event.target.value)} placeholder="Ask about this view…" maxLength={300} /><button type="submit" disabled={!question.trim()} aria-label="Send question"><RiSendPlane2Line /></button></form>
  </aside>;
}
