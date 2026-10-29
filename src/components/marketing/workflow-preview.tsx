"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  CarFront,
  Check,
  ChevronRight,
  MousePointer2,
  UserRound,
} from "lucide-react";
import { workflowSteps } from "@/lib/marketing-data";

export function WorkflowPreview() {
  const [active, setActive] = useState(3);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % workflowSteps.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + workflowSteps.length) % workflowSteps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = workflowSteps.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }
  return (
    <div className="workflow-demo">
      <div
        className="workflow-tabs"
        role="tablist"
        aria-label="Örnek servis aşamaları"
      >
        {workflowSteps.map((step, index) => (
          <button
            key={step.title}
            role="tab"
            id={`stage-${index}`}
            aria-selected={active === index}
            aria-controls="workflow-panel"
            tabIndex={active === index ? 0 : -1}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            onClick={() => setActive(index)}
            onKeyDown={(event) => navigate(event, index)}
            className={`workflow-step ${active === index ? "is-current" : ""} ${active > index ? "is-complete" : ""}`}
          >
            <span className="step-number">
              {index < active ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                `0${index + 1}`
              )}
            </span>
            <span>{step.title}</span>
            <ChevronRight
              className="step-chevron"
              size={16}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <div
        id="workflow-panel"
        role="tabpanel"
        aria-labelledby={`stage-${active}`}
        tabIndex={0}
        className="workflow-panel"
      >
        <div className="workflow-car">
          <span className="large-car-icon">
            <CarFront size={27} aria-hidden="true" />
          </span>
          <div>
            <strong>31 ABC 123</strong>
            <span>Renault Megane</span>
          </div>
        </div>
        <dl className="workflow-details">
          <div>
            <dt>Müşteri</dt>
            <dd>Ahmet Yılmaz</dd>
          </div>
          <div>
            <dt>Şikâyet</dt>
            <dd>Fren sırasında ses</dd>
          </div>
          <div>
            <dt>Ana usta</dt>
            <dd>
              <UserRound size={14} aria-hidden="true" /> Mehmet
            </dd>
          </div>
        </dl>
        <div className="workflow-state">
          <span
            className={`status-badge ${active >= 5 ? "success" : active === 2 ? "warning" : "info"}`}
          >
            <i />
            {workflowSteps[active].status}
          </span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
        <p className="workflow-explanation" aria-live="polite">
          {workflowSteps[active].description}
        </p>
      </div>
      <p className="demo-caption">
        <MousePointer2 size={14} aria-hidden="true" /> Aşamalara tıklayarak servis adımlarını ve detaylarını inceleyebilirsiniz.
      </p>
    </div>
  );
}
