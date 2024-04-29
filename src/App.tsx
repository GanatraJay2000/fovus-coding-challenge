import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

type Inputs = {
  textInput: string;
  fileInput: FileList;
};

const isTextFile = (fileName: string): boolean => {
  const acceptedExtensions = ["txt", "text"];
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  return acceptedExtensions.includes(fileExtension!);
};

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const formSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      setIsSubmitting(true);
      const file = data.fileInput[0];
      if (!isTextFile(file.name)) {
        throw new Error("Invalid file type");
      }
      const baseURL = import.meta.env.VITE_BASE_URL;
      const preSignerResponse = await axios.post(baseURL + "getPreSignedUrl", {
        fileName: file.name,
      });
      const preSignedUrl = preSignerResponse.data.uploadUrl;

      const uploadS3Response = await axios.put(preSignedUrl, file);
      if (uploadS3Response.status === 200) {
        const response = await axios.post(baseURL + "updateDB", {
          textInput: data.textInput,
          fileInputPath: file.name,
        });
        setIsSubmitting(false);
        toast(response.data.message, {
          action: { label: "X", onClick: () => {} },
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      toast(String(error), {
        action: { label: "X", onClick: () => {} },
      });
    }
  };

  return (
    <div className="bg-slate-100 min-h-dvh w-full p-2 md:p-10">
      <form
        onSubmit={handleSubmit(formSubmit)}
        className="bg-white shadow-lg p-5 md:p-10 rounded-lg md:w-2/3 lg:w-1/2 mx-auto"
      >
        <div className="flex flex-col lg:flex-row lg:items-center mb-5">
          <Label className="md:w-1/3 text-xl mr-5" htmlFor="textInput">
            Text Input:
          </Label>
          <div className="w-full">
            <Input
              {...register("textInput", { required: true })}
              id="textInput"
              className={
                errors.textInput &&
                "border border-red-500 placeholder:text-red-500"
              }
              placeholder={
                errors.textInput ? "This field is required" : "Input Text"
              }
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center mb-5">
          <Label className="md:w-1/3 text-xl mr-5" htmlFor="fileInput">
            File Input:
          </Label>
          <div className="w-full">
            <Input
              {...register("fileInput", { required: true })}
              id="fileInput"
              type="file"
              className={
                errors.fileInput &&
                "border border-red-500 placeholder:text-red-500"
              }
            />
          </div>
        </div>
        <Button type="submit" className="px-5 py-3" disabled={isSubmitting}>
          {isSubmitting && (
            <span className="mr-2">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-200 animate-spin dark:text-gray-600 fill-white"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </span>
          )}
          Submit
        </Button>
      </form>
      <div className="text-center mt-2 text-slate-300 md:text-lg">
        Developed by Jay Ganatra
      </div>
    </div>
  );
}

export default App;
