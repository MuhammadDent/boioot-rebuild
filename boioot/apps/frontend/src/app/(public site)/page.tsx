"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { propertiesService } from "@/services/properties.service";
import { projectsService } from "@/services/projects.service";
import PropertyCard from "@/components/properties/PropertyCard";
import ProjectCard from "@/components/projects/ProjectCard";
import Spinner from "@/components/ui/Spinner";
import type { PropertyResponse, ProjectResponse } from "@/types";

export default function HomePage() {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      propertiesService.getPublicList({ pageSize: 6 }),
      projectsService.getPublicList({ pageSize: 3 }),
    ]).then(([propsRes, projsRes]) => {
      if (propsRes.status === "fulfilled") setProperties(propsRes.value.items);
      if (projsRes.status === "fulfilled") setProjects(projsRes.value.items);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <section
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, #1b5e20 100%)",
          color: "#fff",
          padding: "5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>
            ابحث عن منزلك المثالي في سوريا
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.85, marginBottom: "2rem" }}>
            آلاف العقارات والمشاريع في جميع المحافظات السورية
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/properties" className="btn btn-primary" style={{ background: "#fff", color: "var(--color-primary)" }}>
              تصفح العقارات
            </Link>
            <Link href="/projects" className="btn btn-outline" style={{ borderColor: "#fff", color: "#fff" }}>
              استكشف المشاريع
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1.5rem" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>أحدث العقارات</h2>
            <Link href="/properties" className="btn btn-outline btn-sm">عرض الكل</Link>
          </div>

          {loading ? (
            <Spinner />
          ) : properties.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>لا توجد عقارات متاحة حالياً.</p>
          ) : (
            <div className="grid-cards">
              {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </section>

      {(loading || projects.length > 0) && (
        <section style={{ padding: "4rem 1.5rem", background: "var(--color-bg-secondary)" }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>أبرز المشاريع</h2>
              <Link href="/projects" className="btn btn-outline btn-sm">عرض الكل</Link>
            </div>

            {loading ? (
              <Spinner />
            ) : (
              <div className="grid-cards">
                {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

